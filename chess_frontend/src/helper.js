export const getCharacter = file => String.fromCharCode(97 + file);

export function createPosition() {
    // Create an 8x8 empty board
    const position = new Array(8).fill(null).map(x => new Array(8).fill(''));
    
    // Set up pawns
    for (let i = 0; i < 8; i++) {
        position[1][i] = 'wp'; // White pawns on rank 1
        position[6][i] = 'bp'; // Black pawns on rank 6
    }
    
    // Set up white pieces (bottom of the board)
    position[0][0] = 'wr'; // Rook
    position[0][7] = 'wr'; // Rook
    position[0][1] = 'wh'; // Knight (h for horse)
    position[0][6] = 'wh'; // Knight
    position[0][2] = 'wb'; // Bishop
    position[0][5] = 'wb'; // Bishop
    position[0][3] = 'wq'; // Queen
    position[0][4] = 'wk'; // King
    
    // Set up black pieces (top of the board)
    position[7][0] = 'br'; // Rook
    position[7][7] = 'br'; // Rook
    position[7][1] = 'bh'; // Knight
    position[7][6] = 'bh'; // Knight
    position[7][2] = 'bb'; // Bishop
    position[7][5] = 'bb'; // Bishop
    position[7][3] = 'bq'; // Queen
    position[7][4] = 'bk'; // King
    
    return position;
}

export const copyPosition = position => {
    const newPosition = new Array(8).fill(null).map(x => new Array(8).fill(''));
    for (let rank = 0; rank < position.length; rank++) {
        for (let file = 0; file < position[0].length; file++) {
            newPosition[rank][file] = position[rank][file];
        }
    }
    return newPosition;
}