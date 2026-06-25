import { Schema, MapSchema, type } from '@colyseus/schema';

export class Player extends Schema {
    @type('float32') x: number = 0;
    @type('float32') y: number = 0;
    @type('string') direction: string = 'down';
    @type('boolean') isMoving: boolean = false;
}

export class GameState extends Schema {
    @type({ map: Player }) players: MapSchema<Player> = new MapSchema<Player>();
}
