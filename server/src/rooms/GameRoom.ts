import { Room, type Client } from 'colyseus';
import { GameState, Player } from './schema';

const MAP_WIDTH = 320;
const MAP_HEIGHT = 320;
const PLAYER_SPEED = 120;
const TICK_RATE = 20; // server updates per second

interface MoveMessage {
    x: number;
    y: number;
    direction: string;
    isMoving: boolean;
}

export class GameRoom extends Room<GameState> {
    private spawnPoints = [
        { x: 160, y: 160 },
        { x: 256, y: 256 },
        { x: 80, y: 80 },
        { x: 200, y: 100 },
    ];

    onCreate() {
        this.setState(new GameState());
        this.setSimulationInterval(() => this.tick(), 1000 / TICK_RATE);

        // Handle movement messages
        this.onMessage('move', (client: Client, message: MoveMessage) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const dx = message.x - player.x;
            const dy = message.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = (PLAYER_SPEED / TICK_RATE) * 3; // allow some slack

            if (dist <= maxDist) {
                player.x = Math.max(32, Math.min(MAP_WIDTH - 32, message.x));
                player.y = Math.max(32, Math.min(MAP_HEIGHT - 32, message.y));
            }

            player.direction = message.direction;
            player.isMoving = message.isMoving;
        });
    }

    onJoin(client: Client) {
        const spawn = this.spawnPoints[this.state.players.size % this.spawnPoints.length];
        const player = new Player();
        player.x = spawn.x;
        player.y = spawn.y;
        player.direction = 'down';
        player.isMoving = false;

        this.state.players.set(client.sessionId, player);
        console.log(`[GameRoom] ${client.sessionId} joined (${this.state.players.size} players)`);
    }

    onLeave(client: Client) {
        this.state.players.delete(client.sessionId);
        console.log(`[GameRoom] ${client.sessionId} left (${this.state.players.size} players)`);
    }

    private tick() {
        // (future: validate positions against collision map)
    }
}
