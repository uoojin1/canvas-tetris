import {Meteor} from 'meteor/meteor';


Meteor.startup(() => {

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d'); // need context to draw
context.scale(20,20); // scaling everything by 20 times inside the canvas

let createMatrix = (width, height) => {
    const matrix = [];
    while(height--) {
        matrix.push(new Array(width).fill(0));
    }
    return matrix;
}

const arena = createMatrix(12, 20);
const player = {
    pos: { x: 0, y: 0},
    matrix : null,
    score: 0
};
const shadow = {
    pos: { x: 0, y: 0 },
    matrix : null
}

let lastTime = 0;
let dropCounter = 0; // count ticking for the element to drop
let dropInterval = 1000; // 1 ms

const colors = [
    null,
    '#8ea604',
    '#f5bb00',
    '#ff6201',
    '#ed1c24',
    '#0e7c7b',
    '#0d497c',
    '#7f0e7d',
    '#595959'
];

function arenaSweep() {
    let rowCount = 1;
    outer: for(let y = arena.length -1; y > 0; --y){
        for(let x = 0; x < arena[y].length; ++x){
            if(arena[y][x]===0){
                continue outer;
            }
        }
        const row = arena.splice(y,1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        rowCount *= 2;
    }
    console.log('arenaSweep called');
}

let collide = (arena, player) => {
    const [matrix, offset] = [player.matrix, player.pos];
    for( let y = 0; y < matrix.length; ++y ){ // matrix rows
        for( let x = 0; x < matrix[y].length; ++x ){ // matrix row[y]'s column length
            if( matrix[y][x] !== 0 && 
                (arena[y + offset.y] && arena[y+offset.y][x+offset.x]) !== 0){
                return true;
            }
        }
    }
    return false;
}


let createPiece = (type) => {
    if (type === 'T'){
        return [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0]
        ];
    } else if (type === 'O'){
        return [
            [2, 2],
            [2, 2]
        ];
    } else if (type === 'L'){
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3]
        ];
    } else if (type === 'J'){
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0]
        ];
    } else if (type === 'I'){
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0]
        ];
    } else if (type === 'S'){
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0]
        ];
    } else if (type === 'Z'){
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0]
        ];
    }
}

let clearCanavs = () => {
    context.fillStyle = '#f4f4f4';
    context.fillRect(0, 0, canvas.width, canvas.height);
}

let merge = (arena, player) => {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

let playerDrop = () => {
    player.pos.y++;
    if( collide(arena, player) ) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

let playerMove = (dir) => {
    player.pos.x += dir;
    if (collide(arena, player)){
        player.pos.x -= dir;
    }
}

function draw() {
    clearCanavs();
    drawMatrix(arena, {x: 0, y: 0}); // arena is never drawn with any offset or has any offset so 0,0 
    drawMatrix(player.matrix, player.pos);
    shadow.matrix = player.matrix;
    shadow.pos.x = player.pos.x;
    drawShadow(shadow.matrix, shadow.pos);
}

let drawMatrix = (matrix, offset) => {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}
let drawShadow = (matrix, offset) => {
    while(!collide(arena, shadow)){
        shadow.pos.y++;
    }
    shadow.pos.y--;
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.strokeStyle = colors[8];
                context.lineWidth = .07;
                context.strokeRect(x + offset.x, y + shadow.pos.y, 1, 1);
            }
        });
    });
}

let playerReset = () => {
    const pieces = 'ILJOTSZ';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]); // floored
    player.pos.y = 0;
    player.pos.x = (arena[0].length/2 | 0) - (player.matrix[0].length/2 | 0);

    shadow.pos.y = player.pos.y;
    shadow.pos.x = player.pos.x;

    if(collide(arena, player)){
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
    }
}

let playerRotate = (dir) => {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    /**
     * keep going left and right by 1 more until cleared
     */
    while (collide(arena, player)){
        player.pos.x += offset;
        offset = - (offset + (offset > 0 ? 1: -1));
        /**
         * if offset grows too large and it doesn't make sense to move the piece that far, just keep 
         * that position, and revert the rotation. player should be stuck here
         */
        if(offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

let playerFreeFall = () => {
    while (!collide(arena, player)){
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    updateScore();
    playerReset();
}

let rotate = (matrix, dir) => {
    let rotated = createMatrix(matrix[0].length, matrix.length);
    let maxRow = matrix.length - 1;
    let maxCol = matrix[0].length - 1;
    for (let y = 0; y < matrix.length; ++y){
        for( let x = 0; x < matrix[y].length; ++x){
            if(dir === -1) { // clockwise
                rotated[y][x] = matrix[x][maxRow-y];
            } else if (dir === 1) { // counter clockwise
                rotated[y][x] = matrix[maxCol-x][y];
            }
        }
    }
    player.matrix = rotated;
}


/**
 * deltaTime is roughly 16ms, at each update call it gets added to the dropCounter variable
 * once dropCounter > 1s, the tetromino drops by 1 step.
 * @param {*} time actual time variable that starts from 0 and keeps increasing
 */
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if( dropCounter > dropInterval ) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

let updateScore = () => {
    document.getElementById('score').innerText = player.score;
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight'){
        playerMove(1);
    } else if (event.key === 'ArrowDown'){
        playerDrop();
    } else if (event.key === 'ArrowUp'){
        playerRotate(1);
    } else if (event.key === 'z'){
        playerRotate(-1);
    } else if (event.keyCode === 32){
        playerFreeFall();
    }
});

  updateScore();
  playerReset();
  update();
});
