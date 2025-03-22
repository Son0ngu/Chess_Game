
import './Board.css';
import Files from './bits/Files';
import Ranks from './bits/Ranks';
import Pieces from './Pieces/Pieces';

const Board = () => {

    const ClassName = (i,j) => {
        let c = 'tile';
        c += (i+j)%2 === 0 ? ' tile--dark'  :  ' tile--light';
        return c;
    };

    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const files = Array(8).fill().map((x,i)=>i+1);

    return <div className="board">

        <Ranks ranks = {ranks}/>

        <div className='tiles'>
            {ranks.map((rank, i)=> 
                files.map((file,j)=>
                    <div key={file+'-'+rank} className={ClassName(9-i,j)}></div>))}
        </div>

        <Pieces/>
        
        <Files files = {files}/>
    </div>
}

export default Board