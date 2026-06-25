import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        const { width, height } = this.cameras.main;

        // Loading bar
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const progressBar = this.add.graphics();
        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0x44aacc, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
        });

        // Load tilemap and tileset
        this.load.tilemapTiledJSON('room', '/assets/maps/room.json');
        this.load.image('tiles', '/assets/tilesets/tileset.png');

        this.load.spritesheet('player', '/assets/sprites/player.png', {
            frameWidth: 16,
            frameHeight: 24,
        });
    }

    create() {
        this.scene.start('Game');
    }
}
