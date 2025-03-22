const Piece = ({
    rank,
    file,
    piece,
}) => {
    const onDragStart = e => {
        e.dataTransfer.setData('text/plain', `${piece},${file},${rank}`);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
        e.target.style.display = 'none';
    },0);
    }
    const onDragEnd = e => {
        // Only reset display if the drop wasn't a move
        if (e.dataTransfer.dropEffect === 'none') {
            e.target.style.display = 'block';
        }
        // Otherwise, do nothing so that the piece remains hidden in its old position.
    };
    
    return(
        <div 
            className={`piece ${piece} p-${file}${rank}`}
            draggable='true'
            onDragEnd={onDragEnd}
            onDragStart = {onDragStart}
        ></div>
    )
}

export default Piece;