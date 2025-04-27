import React from 'react';
import '../App.css';

export default function MoveHistory({ moveNotation = [] }) {
  // Group moves in pairs for display (white's move + black's move)
  const moveGroups = [];
  for (let i = 0; i < moveNotation.length; i += 2) {
    moveGroups.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moveNotation[i],
      black: moveNotation[i + 1] || ''
    });
  }

  return (
    <div className="move-history">
      <h3>Move History</h3>
      <div className="move-list">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>White</th>
              <th>Black</th>
            </tr>
          </thead>
          <tbody>
            {moveGroups.map((group) => (
              <tr key={group.moveNumber}>
                <td>{group.moveNumber}.</td>
                <td>{group.white}</td>
                <td>{group.black}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}