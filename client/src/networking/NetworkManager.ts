import { Client, Room, getStateCallbacks } from 'colyseus.js';

const SERVER_URL = 'ws://localhost:2567';
const SEND_RATE = 15; // messages per second

export interface PlayerState {
    x: number;
    y: number;
    direction: string;
    isMoving: boolean;
}

export type PlayerChangeCallback = (sessionId: string, player: PlayerState) => void;
export type PlayerRemoveCallback = (sessionId: string) => void;

export class NetworkManager {
    private client: Client;
    private room: Room | null = null;
    private sendInterval: ReturnType<typeof setInterval> | null = null;
    private lastSent = { x: 0, y: 0, direction: 'down', isMoving: false };
    private localX = 0;
    private localY = 0;
    private localDirection = 'down';
    private localIsMoving = false;

    private onPlayerAdd: PlayerChangeCallback | null = null;
    private onPlayerChange: PlayerChangeCallback | null = null;
    private onPlayerRemove: PlayerRemoveCallback | null = null;
    private messageSubscribers = new Map<string | number, Set<(message: unknown) => void>>();
    private anyMessageSubscribers = new Set<(type: string | number, message: unknown) => void>();

    public sessionId: string | null = null;

    constructor() {
        this.client = new Client(SERVER_URL);
    }

    async connect(): Promise<{ x: number; y: number }> {
        this.room = await this.client.joinOrCreate('game');
        this.sessionId = this.room.sessionId;

        // Route room messages through a local pub/sub layer so additional systems
        // (voice, gameplay events, etc.) can subscribe without owning Room directly.
        this.room.onMessage('*', (type, message) => {
            const typedSet = this.messageSubscribers.get(type);
            if (typedSet) {
                for (const callback of typedSet) {
                    callback(message);
                }
            }

            for (const callback of this.anyMessageSubscribers) {
                callback(type, message);
            }
        });

        // Wait for initial state to be received
        await new Promise<void>((resolve) => {
            this.room!.onStateChange.once(() => resolve());
        });

        // Get the callback proxy for state listening
        const $ = getStateCallbacks(this.room);

        // Listen for player add/remove on the players map
        $(this.room.state).players.onAdd((player: PlayerState, sessionId: string) => {
            if (sessionId === this.sessionId) {
                this.localX = player.x;
                this.localY = player.y;
            }
            this.onPlayerAdd?.(sessionId, {
                x: player.x,
                y: player.y,
                direction: player.direction,
                isMoving: player.isMoving,
            });

            $(player).onChange(() => {
                this.onPlayerChange?.(sessionId, {
                    x: player.x,
                    y: player.y,
                    direction: player.direction,
                    isMoving: player.isMoving,
                });
            });
        }, true); // immediate = true, triggers for already existing players

        $(this.room.state).players.onRemove((_player: PlayerState, sessionId: string) => {
            this.onPlayerRemove?.(sessionId);
        });

        this.sendInterval = setInterval(() => this.sendPosition(), 1000 / SEND_RATE);

        const myPlayer = this.room.state.players.get(this.sessionId);
        return { x: myPlayer?.x ?? 160, y: myPlayer?.y ?? 160 };
    }

    setCallbacks(
        onAdd: PlayerChangeCallback,
        onChange: PlayerChangeCallback,
        onRemove: PlayerRemoveCallback,
    ) {
        this.onPlayerAdd = onAdd;
        this.onPlayerChange = onChange;
        this.onPlayerRemove = onRemove;
    }

    updateLocalPosition(x: number, y: number, direction: string, isMoving: boolean) {
        this.localX = x;
        this.localY = y;
        this.localDirection = direction;
        this.localIsMoving = isMoving;
    }

    onMessage<T = unknown>(type: string | number, callback: (message: T) => void): () => void {
        let callbacks = this.messageSubscribers.get(type);
        if (!callbacks) {
            callbacks = new Set();
            this.messageSubscribers.set(type, callbacks);
        }

        const wrapped = callback as (message: unknown) => void;
        callbacks.add(wrapped);

        return () => {
            callbacks.delete(wrapped);
            if (callbacks.size === 0) {
                this.messageSubscribers.delete(type);
            }
        };
    }

    onAnyMessage(callback: (type: string | number, message: unknown) => void): () => void {
        this.anyMessageSubscribers.add(callback);
        return () => {
            this.anyMessageSubscribers.delete(callback);
        };
    }

    sendMessage<T = unknown>(type: string | number, message: T) {
        this.room?.send(type, message);
    }

    getRemoteSessionIds(): string[] {
        if (!this.room) return [];

        const result: string[] = [];
        (this.room.state.players as Map<string, PlayerState>).forEach((_player, sessionId) => {
            if (sessionId !== this.sessionId) {
                result.push(sessionId);
            }
        });

        return result;
    }

    private sendPosition() {
        if (!this.room) return;

        const { localX: x, localY: y, localDirection: direction, localIsMoving: isMoving } = this;

        if (
            x === this.lastSent.x &&
            y === this.lastSent.y &&
            direction === this.lastSent.direction &&
            isMoving === this.lastSent.isMoving
        ) return;

        this.room.send('move', { x, y, direction, isMoving });
        this.lastSent = { x, y, direction, isMoving };
    }

    disconnect() {
        if (this.sendInterval) clearInterval(this.sendInterval);
        this.room?.leave();
        this.room = null;
        this.messageSubscribers.clear();
        this.anyMessageSubscribers.clear();
    }
}

export const network = new NetworkManager();
