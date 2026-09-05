/* Pure game rules, shared by the games and development checks. */
(function (root) {
  function shuffle(items, random = Math.random) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function validNumber(board, row, col, value) {
    for (let i = 0; i < 4; i++) {
      if (i !== col && board[row][i] === value) return false;
      if (i !== row && board[i][col] === value) return false;
    }
    const top = row - row % 2, left = col - col % 2;
    for (let r = top; r < top + 2; r++) for (let c = left; c < left + 2; c++) {
      if ((r !== row || c !== col) && board[r][c] === value) return false;
    }
    return true;
  }
  function solutionCount(board, limit = 2) {
    const a = board.map(row => row.slice());
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (a[r][c] && !validNumber(a, r, c, a[r][c])) return 0;
    }
    let count = 0;
    function solve() {
      if (count >= limit) return;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        if (a[r][c]) continue;
        for (let n = 1; n <= 4; n++) if (validNumber(a, r, c, n)) {
          a[r][c] = n; solve(); a[r][c] = 0;
        }
        return;
      }
      count++;
    }
    solve();
    return count;
  }
  function makePuzzle(solution, blanks) {
    const puzzle = solution.map(row => row.slice());
    let removed = 0;
    for (const i of shuffle(Array.from({ length: 16 }, (_, i) => i))) {
      const r = Math.floor(i / 4), c = i % 4, old = puzzle[r][c];
      puzzle[r][c] = 0;
      if (solutionCount(puzzle) !== 1) puzzle[r][c] = old;
      else if (++removed >= blanks) break;
    }
    return puzzle;
  }
  function path(grid, start, end) {
    const queue = [[...start]], previous = new Map([[start.join(','), null]]);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      if (x === end[0] && y === end[1]) {
        const result = []; let key = end.join(',');
        while (key !== null) { result.unshift(key.split(',').map(Number)); key = previous.get(key); }
        return result;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = nx + ',' + ny;
        if (!grid[ny]?.[nx] || previous.has(key)) continue;
        previous.set(key, x + ',' + y); queue.push([nx, ny]);
      }
    }
    return [];
  }
  function wordRoute(words, length) {
    function visit(route, used) {
      if (route.length === length) return route;
      for (const word of shuffle(words.filter(w => !used.has(w.read) && w.read[0] === route.at(-1).last))) {
        const result = visit([...route, word], new Set([...used, word.read]));
        if (result) return result;
      }
      return null;
    }
    for (const first of shuffle(words)) {
      const result = visit([first], new Set([first.read]));
      if (result) return result;
    }
    throw Error('指定の長さのしりとりを作れません。辞書を確認してください。');
  }
  function sudokuReasonLevel(puzzle){for(let level=0;level<3;level++){const board=puzzle.map(r=>r.slice());let changed=true;while(changed){changed=false;for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(!board[r][c]){const candidates=[1,2,3,4].filter(n=>!board[r].includes(n)&&(level<1||!board.some(row=>row[c]===n))&&(level<2||validNumber(board,r,c,n)));if(candidates.length===1){board[r][c]=candidates[0];changed=true;}}}if(board.flat().every(Boolean))return level;}return 3;}
  function wordSuffix(words,last,remaining,used=[]){const seen=new Set(used);function visit(char,left){if(!left)return [];for(const w of words){if(seen.has(w.read)||w.read[0]!==char)continue;seen.add(w.read);const rest=visit(w.last,left-1);seen.delete(w.read);if(rest)return [w,...rest];}return null;}return visit(last,remaining);}
  function symbol(index) {
    const colors = ['#ea6571', '#527bc5', '#30a080', '#aa69bc', '#d89625'];
    const shapes = ['<circle cx="32" cy="32" r="20"/>', '<path d="M32 10 55 52H9Z"/>', '<rect x="13" y="13" width="38" height="38" rx="5"/>', '<path d="m32 8 7 16 18 2-14 12 4 18-15-9-15 9 4-18L7 26l18-2Z"/>'];
    return '<svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true" fill="' + colors[index % 5] + '">' + shapes[Math.floor(index / 5) % 4] + '</svg>';
  }
  const api = { shuffle, validNumber, solutionCount, makePuzzle, path, wordRoute, wordSuffix, sudokuReasonLevel, symbol };
  root.ArcadeRules = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
