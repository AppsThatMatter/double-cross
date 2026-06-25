/**
 * Asset generator - creates pixel art tileset and character spritesheet.
 * Run with: bun run tools/generate-assets.ts
 * 
 * Generates:
 * - client/public/assets/tilesets/tileset.png (4 tiles: wall, floor, floor-alt, wall-top)
 * - client/public/assets/sprites/player.png (4 directions x 4 frames = 16 frames, 16x24 each)
 */

import { writeFileSync } from 'fs';
import { createCanvas } from '@napi-rs/canvas';

const TILE_SIZE = 16;

// --- TILESET ---
function generateTileset() {
    // 4 tiles in a row: wall, floor, floor-variant, wall-top
    const canvas = createCanvas(64, 16);
    const ctx = canvas.getContext('2d');

    // Tile 1: Wall (dark brick pattern)
    drawWallTile(ctx, 0, 0);

    // Tile 2: Floor (wooden planks)
    drawFloorTile(ctx, 16, 0);

    // Tile 3: Floor variant (slightly different shade)
    drawFloorVariantTile(ctx, 32, 0);

    // Tile 4: Wall top (darker, solid)
    drawWallTopTile(ctx, 48, 0);

    const buffer = canvas.toBuffer('image/png');
    writeFileSync('client/public/assets/tilesets/tileset.png', buffer);
    console.log('✓ tileset.png generated (4 tiles, 64x16)');
}

function drawWallTile(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    // Dark stone/brick wall
    const base = '#3a3a5c';
    const dark = '#2a2a4a';
    const light = '#4a4a6c';
    const highlight = '#5a5a7c';

    // Fill base
    ctx.fillStyle = base;
    ctx.fillRect(ox, oy, 16, 16);

    // Brick pattern
    ctx.fillStyle = dark;
    // Row 1
    ctx.fillRect(ox, oy, 16, 1);
    ctx.fillRect(ox + 7, oy + 1, 1, 7);
    // Row 2
    ctx.fillRect(ox, oy + 8, 16, 1);
    ctx.fillRect(ox + 3, oy + 9, 1, 7);
    ctx.fillRect(ox + 11, oy + 9, 1, 7);

    // Highlights
    ctx.fillStyle = light;
    ctx.fillRect(ox + 1, oy + 2, 1, 1);
    ctx.fillRect(ox + 9, oy + 3, 1, 1);
    ctx.fillRect(ox + 5, oy + 10, 1, 1);
    ctx.fillRect(ox + 13, oy + 11, 1, 1);

    // Top edge highlight
    ctx.fillStyle = highlight;
    ctx.fillRect(ox + 2, oy + 1, 4, 1);
    ctx.fillRect(ox + 10, oy + 1, 4, 1);
}

function drawFloorTile(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    // Wooden plank floor
    const base = '#8b7355';
    const dark = '#6b5335';
    const light = '#9b8365';
    const grain = '#7b6345';

    ctx.fillStyle = base;
    ctx.fillRect(ox, oy, 16, 16);

    // Plank lines
    ctx.fillStyle = dark;
    ctx.fillRect(ox, oy + 3, 16, 1);
    ctx.fillRect(ox, oy + 7, 16, 1);
    ctx.fillRect(ox, oy + 11, 16, 1);
    ctx.fillRect(ox, oy + 15, 16, 1);

    // Wood grain
    ctx.fillStyle = grain;
    ctx.fillRect(ox + 3, oy + 1, 1, 2);
    ctx.fillRect(ox + 10, oy + 1, 1, 2);
    ctx.fillRect(ox + 6, oy + 5, 1, 2);
    ctx.fillRect(ox + 13, oy + 5, 1, 2);
    ctx.fillRect(ox + 2, oy + 9, 1, 2);
    ctx.fillRect(ox + 9, oy + 9, 1, 2);
    ctx.fillRect(ox + 5, oy + 13, 1, 2);
    ctx.fillRect(ox + 12, oy + 13, 1, 2);

    // Highlights
    ctx.fillStyle = light;
    ctx.fillRect(ox + 1, oy, 2, 1);
    ctx.fillRect(ox + 8, oy + 4, 2, 1);
    ctx.fillRect(ox + 4, oy + 8, 2, 1);
    ctx.fillRect(ox + 11, oy + 12, 2, 1);
}

function drawFloorVariantTile(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    // Slightly different floor
    const base = '#887050';
    const dark = '#685030';
    const light = '#988060';

    ctx.fillStyle = base;
    ctx.fillRect(ox, oy, 16, 16);

    ctx.fillStyle = dark;
    ctx.fillRect(ox, oy + 4, 16, 1);
    ctx.fillRect(ox, oy + 9, 16, 1);
    ctx.fillRect(ox, oy + 14, 16, 1);

    ctx.fillStyle = light;
    ctx.fillRect(ox + 5, oy + 1, 1, 3);
    ctx.fillRect(ox + 12, oy + 6, 1, 3);
    ctx.fillRect(ox + 3, oy + 11, 1, 3);
    ctx.fillRect(ox + 10, oy + 11, 1, 3);
}

function drawWallTopTile(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    // Dark wall cap
    const base = '#2a2a42';
    const dark = '#1a1a32';
    const edge = '#4a4a62';

    ctx.fillStyle = base;
    ctx.fillRect(ox, oy, 16, 16);

    ctx.fillStyle = dark;
    ctx.fillRect(ox, oy + 14, 16, 2);

    ctx.fillStyle = edge;
    ctx.fillRect(ox, oy, 16, 1);
    ctx.fillRect(ox + 4, oy + 5, 2, 1);
    ctx.fillRect(ox + 10, oy + 8, 2, 1);
}

// --- CHARACTER SPRITESHEET ---
function generateCharacter() {
    // 16x24 per frame, 4 frames per direction, 4 directions
    // Layout: 4 columns (frames) x 4 rows (down, left, right, up)
    const frameW = 16;
    const frameH = 24;
    const cols = 4;
    const rows = 4;
    const canvas = createCanvas(frameW * cols, frameH * rows);
    const ctx = canvas.getContext('2d');

    const directions = ['down', 'left', 'right', 'up'] as const;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const ox = col * frameW;
            const oy = row * frameH;
            drawCharacterFrame(ctx, ox, oy, directions[row], col);
        }
    }

    const buffer = canvas.toBuffer('image/png');
    writeFileSync('client/public/assets/sprites/player.png', buffer);
    console.log('✓ player.png generated (4x4 frames, 64x96)');
}

function drawCharacterFrame(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    direction: 'down' | 'left' | 'right' | 'up',
    frame: number
) {
    // Colors
    const skin = '#f5c5a3';
    const hair = '#4a3728';
    const shirt = '#4488cc';
    const shirtDark = '#336699';
    const pants = '#334455';
    const pantsDark = '#223344';
    const shoes = '#2a2a2a';
    const eye = '#222222';
    const outline = '#1a1a2e';

    // Walk bob offset
    const bob = (frame === 1 || frame === 3) ? -1 : 0;
    const legOffset = frame % 2 === 0 ? 0 : 1;

    // --- Head ---
    // Hair
    ctx.fillStyle = hair;
    ctx.fillRect(ox + 5, oy + 2 + bob, 6, 3);
    if (direction === 'down' || direction === 'up') {
        ctx.fillRect(ox + 4, oy + 3 + bob, 8, 2);
    }

    // Face/skin
    ctx.fillStyle = skin;
    if (direction === 'down') {
        ctx.fillRect(ox + 5, oy + 5 + bob, 6, 4);
        // Eyes
        ctx.fillStyle = eye;
        ctx.fillRect(ox + 6, oy + 6 + bob, 1, 2);
        ctx.fillRect(ox + 9, oy + 6 + bob, 1, 2);
    } else if (direction === 'up') {
        ctx.fillRect(ox + 5, oy + 5 + bob, 6, 4);
        // Hair covers from behind
        ctx.fillStyle = hair;
        ctx.fillRect(ox + 5, oy + 5 + bob, 6, 2);
    } else if (direction === 'left') {
        ctx.fillRect(ox + 5, oy + 5 + bob, 5, 4);
        ctx.fillStyle = eye;
        ctx.fillRect(ox + 6, oy + 6 + bob, 1, 2);
    } else {
        ctx.fillRect(ox + 6, oy + 5 + bob, 5, 4);
        ctx.fillStyle = eye;
        ctx.fillRect(ox + 9, oy + 6 + bob, 1, 2);
    }

    // --- Body (shirt) ---
    ctx.fillStyle = shirt;
    ctx.fillRect(ox + 4, oy + 9 + bob, 8, 6);
    // Shirt shading
    ctx.fillStyle = shirtDark;
    if (direction === 'left') {
        ctx.fillRect(ox + 9, oy + 9 + bob, 3, 6);
    } else if (direction === 'right') {
        ctx.fillRect(ox + 4, oy + 9 + bob, 3, 6);
    } else {
        ctx.fillRect(ox + 4, oy + 9 + bob, 2, 6);
        ctx.fillRect(ox + 10, oy + 9 + bob, 2, 6);
    }

    // Arms
    ctx.fillStyle = skin;
    if (direction === 'down' || direction === 'up') {
        ctx.fillRect(ox + 3, oy + 10 + bob, 1, 4);
        ctx.fillRect(ox + 12, oy + 10 + bob, 1, 4);
    }

    // --- Legs ---
    ctx.fillStyle = pants;
    if (direction === 'down' || direction === 'up') {
        ctx.fillRect(ox + 5, oy + 15 + bob, 3, 5);
        ctx.fillRect(ox + 8, oy + 15 + bob, 3, 5);
        // Walk animation - shift legs
        if (legOffset) {
            ctx.fillStyle = pantsDark;
            ctx.fillRect(ox + 5, oy + 15 + bob, 3, 5);
        }
    } else {
        // Side view legs
        ctx.fillRect(ox + 5, oy + 15 + bob, 5, 5);
        if (legOffset) {
            ctx.fillStyle = pantsDark;
            ctx.fillRect(ox + 5, oy + 17 + bob, 5, 3);
        }
    }

    // Shoes
    ctx.fillStyle = shoes;
    ctx.fillRect(ox + 5, oy + 20 + bob, 3, 2);
    ctx.fillRect(ox + 8, oy + 20 + bob, 3, 2);

    // Outline (subtle)
    ctx.fillStyle = outline;
    // Head outline
    ctx.fillRect(ox + 4, oy + 2 + bob, 1, 1);
    ctx.fillRect(ox + 11, oy + 2 + bob, 1, 1);
}

// --- GENERATE ALL ---
async function main() {
    generateTileset();
    generateCharacter();
    console.log('\nAll assets generated! Drop better art into the same paths to replace.');
}

main();
