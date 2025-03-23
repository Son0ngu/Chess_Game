import './Pieces.css';
import Piece from './Piece';
import { createPosition, copyPosition } from '../../../helper';
import { useState, useRef } from 'react';

const Pieces = () => {
    const ref = useRef();
    const [state, setState] = useState(createPosition());

    const calculateCoordinates = e => {
        const { width, left, top } = ref.current.getBoundingClientRect();
        const size = width / 8;
        const file = Math.floor((e.clientX - left) / size);
        const rank = 7 - Math.floor((e.clientY - top) / size);
        return { rank, file };
    };

    const onDrop = e => {
        e.preventDefault();
        
        // Get the piece data from the drag event
        const [piece, oldFile, oldRank] = e.dataTransfer.getData('text').split(',');
        
        // Calculate the new coordinates
        const { rank: newRank, file: newFile } = calculateCoordinates(e);
        
        // Convert string coordinates to numbers
        const numOldRank = parseInt(oldRank);
        const numOldFile = parseInt(oldFile);
        
        // Only proceed if the coordinates are valid
        if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
            // Check if the piece is being dropped in the same position
            if (newRank === numOldRank && newFile === numOldFile) {
                // If dropped in the same position, make sure the piece becomes visible again
                // This is handled by ensuring we update state in a way that triggers a re-render
                const newPosition = copyPosition(state);
                setState(newPosition);
                
                // Reset display style for the dragged piece element
                setTimeout(() => {
                    const pieceElements = document.querySelectorAll(`.piece.${piece}.p-${numOldFile}${numOldRank}`);
                    pieceElements.forEach(el => {
                        el.style.display = 'block';
                    });
                }, 0);
                
                return;
            }
            
            // Create a copy of the current position
            const newPosition = copyPosition(state);
            
            // Update the piece positions
            newPosition[newRank][newFile] = piece;
            newPosition[numOldRank][numOldFile] = '';
            
            // Update the state with the new position
            setState(newPosition);
            console.log(newPosition);
        } else {
            // If dropped outside valid board coordinates, make the piece visible again
            const newPosition = copyPosition(state);
            setState(newPosition);
            
            // Reset display style for the dragged piece element
            setTimeout(() => {
                const pieceElements = document.querySelectorAll(`.piece.${piece}.p-${numOldFile}${numOldRank}`);
                pieceElements.forEach(el => {
                    el.style.display = 'block';
                });
            }, 0);
        }
        
    };

    const onDragOver = e => e.preventDefault();

    return (
        <div 
            ref={ref}
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="pieces"
        >
            {state.map((r, rank) => 
                r.map((p, file) => 
                    p ? (
                        <Piece
                            key={`${rank}-${file}`}
                            piece={p}
                            rank={rank}
                            file={file}
                        />
                    ) : null
                )
            )}
        </div>
    );
};

export default Pieces;