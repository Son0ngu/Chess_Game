const gameAdapter = {
  /**
   * Chuyển đổi từ cấu trúc mảng players sang dạng có whitePlayer/blackPlayer
   */
  toClassicFormat(game) {
    const whitePlayer = game.players?.find(p => p.color === 'white');
    const blackPlayer = game.players?.find(p => p.color === 'black');
    
    return {
      ...game.toObject ? game.toObject() : game,
      whitePlayer: whitePlayer ? whitePlayer.user : null,
      blackPlayer: blackPlayer ? blackPlayer.user : null,
      whitePlayerInfo: whitePlayer,
      blackPlayerInfo: blackPlayer
    };
  },
  
  /**
   * Chuyển đổi từ dạng có whitePlayer/blackPlayer sang cấu trúc mảng players
   */
  toPlayersArrayFormat(game, whitePlayerData, blackPlayerData) {
    const gameObj = game.toObject ? game.toObject() : { ...game };
    
    // Tạo mảng players
    const players = [];
    
    if (gameObj.whitePlayer || whitePlayerData) {
      const user = gameObj.whitePlayer || whitePlayerData;
      players.push({
        user: user._id || user,
        username: user.username || 'White Player',
        color: 'white'
      });
    }
    
    if (gameObj.blackPlayer || blackPlayerData) {
      const user = gameObj.blackPlayer || blackPlayerData;
      players.push({
        user: user._id || user,
        username: user.username || 'Black Player',
        color: 'black'
      });
    }
    
    return {
      ...gameObj,
      players
    };
  }
};

module.exports = gameAdapter;