import './Pieces.css';
import Piece from './Piece';

const Pieces = () => {
    const position = new Array(8).fill('').map(x => new Array(8).fill(''))

    for ( let i =0; i < 8; i++) {
        position[1][i] = 'wp';
        position[6][i] = 'bp';
    }

    position[0][0] = 'wr';
    position[0][7] = 'wr';
    position[0][1] = 'wh';
    position[0][6] = 'wh';
    position[0][2] = 'wb';
    position[0][5] = 'wb';
    position[0][3] = 'wq';
    position[0][4] = 'wk';
  
    position[7][0] = 'br';
    position[7][7] = 'br';
    position[7][1] = 'bh';
    position[7][6] = 'bh';
    position[7][2] = 'bb';
    position[7][5] = 'bb';
    position[7][3] = 'bq';
    position[7][4] = 'bk';
    
    console.log(position);

    return <div className="pieces">
        {position.map((r, rank) => r.map((f,file) => 
            position[rank][file] 
            ? <Piece
                key = {rank + '-' + file}
                piece = {position[rank][file]}
                rank = {rank}
                file = {file}
            />
            : null
        ))}
    </div>
}

export default Pieces;