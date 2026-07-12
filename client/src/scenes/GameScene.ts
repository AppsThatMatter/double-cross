import Phaser from 'phaser';
import { network } from '../networking/NetworkManager';
import { voice } from '../voice/VoiceManager';

const PLAYER_SPEED = 120;
const LERP_SPEED = 0.15;

interface RemotePlayer {
    sprite: Phaser.GameObjects.Sprite;
    targetX: number;
    targetY: number;
    direction: string;
    isMoving: boolean;
}

export class GameScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    private wallLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
    private remotePlayers = new Map<string, RemotePlayer>();
    private currentDirection = 'down';
    private isNetworkConnected = false;

    constructor() {
        super('Game');
    }

    async create() {
        // --- Tilemap ---
        const map = this.make.tilemap({ key: 'room' });
        const tileset = map.addTilesetImage('main', 'tiles')!;

        map.createLayer('Ground', tileset, 0, 0);

        this.wallLayer = map.createLayer('Walls', tileset, 0, 0)!;
        this.wallLayer.setCollisionByExclusion([-1, 0]);

        this.createAnimations();

        network.setCallbacks(
            (sessionId, state) => this.onPlayerAdd(sessionId, state),
            (sessionId, state) => this.onPlayerChange(sessionId, state),
            (sessionId) => this.onPlayerRemove(sessionId),
        );

        let spawnX = 160;
        let spawnY = 160;

        try {
            const spawn = await network.connect();
            spawnX = spawn.x;
            spawnY = spawn.y;
            this.isNetworkConnected = true;

            try {
                await voice.start(network);
            } catch (voiceError) {
                console.warn('Voice initialization failed:', voiceError);
            }
        } catch (err) {
            console.warn('Could not connect to server, playing offline:', err);
            // Fall back to tilemap spawn point
            const spawnPoint = map.findObject('Objects', obj => obj.name === 'PlayerSpawn');
            spawnX = spawnPoint?.x ?? 160;
            spawnY = spawnPoint?.y ?? 160;
        }

        this.player = this.physics.add.sprite(spawnX, spawnY, 'player', 0);
        this.player.setSize(12, 16);
        this.player.setOffset(2, 8);
        this.player.setCollideWorldBounds(true);

        this.physics.add.collider(this.player, this.wallLayer);

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasd = {
            W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            voice.stop();
            network.disconnect();
        });
    }

    update() {
        if (!this.player) return;

        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const up = this.cursors.up.isDown || this.wasd.W.isDown;
        const down = this.cursors.down.isDown || this.wasd.S.isDown;

        this.player.setVelocity(0);

        if (left) {
            this.player.setVelocityX(-PLAYER_SPEED);
            this.currentDirection = 'left';
        } else if (right) {
            this.player.setVelocityX(PLAYER_SPEED);
            this.currentDirection = 'right';
        }

        if (up) {
            this.player.setVelocityY(-PLAYER_SPEED);
            this.currentDirection = 'up';
        } else if (down) {
            this.player.setVelocityY(PLAYER_SPEED);
            this.currentDirection = 'down';
        }

        const isMoving = left || right || up || down;
        if (isMoving) {
            this.player.body!.velocity.normalize().scale(PLAYER_SPEED);
        }

        if (isMoving) {
            this.player.anims.play(`walk-${this.currentDirection}`, true);
        } else {
            this.player.anims.stop();
        }

        network.updateLocalPosition(
            this.player.x,
            this.player.y,
            this.currentDirection,
            isMoving,
        );

        this.updateRemotePlayers();
    }

    private onPlayerAdd(sessionId: string, state: { x: number; y: number; direction: string; isMoving: boolean }) {
        if (sessionId === network.sessionId) return;

        const sprite = this.add.sprite(state.x, state.y, 'player', 0);
        sprite.setTint(0xaaffaa); // Tint remote players slightly to distinguish

        this.remotePlayers.set(sessionId, {
            sprite,
            targetX: state.x,
            targetY: state.y,
            direction: state.direction,
            isMoving: state.isMoving,
        });

        if (this.isNetworkConnected) {
            voice.onPeerJoined(sessionId);
        }
    }

    private onPlayerChange(sessionId: string, state: { x: number; y: number; direction: string; isMoving: boolean }) {
        if (sessionId === network.sessionId) return;

        const remote = this.remotePlayers.get(sessionId);
        if (!remote) return;

        remote.targetX = state.x;
        remote.targetY = state.y;
        remote.direction = state.direction;
        remote.isMoving = state.isMoving;
    }

    private onPlayerRemove(sessionId: string) {
        voice.onPeerLeft(sessionId);

        const remote = this.remotePlayers.get(sessionId);
        if (remote) {
            remote.sprite.destroy();
            this.remotePlayers.delete(sessionId);
        }
    }

    private updateRemotePlayers() {
        for (const remote of this.remotePlayers.values()) {
            remote.sprite.x += (remote.targetX - remote.sprite.x) * LERP_SPEED;
            remote.sprite.y += (remote.targetY - remote.sprite.y) * LERP_SPEED;

            // Animate
            if (remote.isMoving) {
                remote.sprite.anims.play(`walk-${remote.direction}`, true);
            } else {
                remote.sprite.anims.stop();
            }
        }
    }

    private createAnimations() {
        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1,
        });
        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
            frameRate: 8,
            repeat: -1,
        });
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
            frameRate: 8,
            repeat: -1,
        });
        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
            frameRate: 8,
            repeat: -1,
        });
    }
}
