import './Pieces.css';
import Piece from './Piece';
import { createPosition, copyPosition } from '../../../helper';
import {useState,useRef} from 'react';


//apply react state to the pieces
const Pieces = () => {
    const ref = useRef();

    const [state, setState] = useState(createPosition());

    const calculateCoordinates = e => {
        const{width,left,top}= ref.current.getBoundingClientRect();
        const size = width/8;
        const y = Math.floor((e.clientX - left)/size);
        const x = 7 - Math.floor((e.clientY - top)/size);
        return {x,y}
        //calculate the coordinate of each cell
    }


    const onDrop = e => {
        //console.log(e.dataTransfer.getData('text'));
        //console.log(e.clientX, e.clientY);
        
        const newPosition = copyPosition(state);
        const {x,y} = calculateCoordinates(e);
        const [p,rank,file] = e.dataTransfer.getData('text').split(',');
        newPosition[rank][file] = '';
        
        newPosition[x][y] = p;
        console.log(newPosition);
        console.log(p,rank,file);
        setState(newPosition);
    }
    

    const onDragOver = e =>e.preventDefault();
    return <div 
    ref = {ref}
    onDrop ={onDrop}
    onDragOver = {onDragOver}
    className="pieces">
        {state.map((r, rank) => r.map((f,file) => 
            state[rank][file] 
            ? <Piece
                key = {rank + '-' + file}
                piece = {state[rank][file]}
                rank = {rank}
                file = {file}
            />
            : null
        ))}
    </div>
}

export default Pieces;