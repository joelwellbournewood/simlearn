// Uniform spatial hash rebuilt every tick by counting sort. O(N), no allocation after
// construction, no hash collisions to resolve, and the agent order it produces is a
// cache-friendly traversal order as a free side effect.
export class Grid {
  constructor(worldW, worldH, cell, capacity) {
    this.cell = cell;
    this.cols = Math.max(1, Math.floor(worldW / cell));
    this.rows = Math.max(1, Math.floor(worldH / cell));
    this.invW = this.cols / worldW;
    this.invH = this.rows / worldH;
    this.n = this.cols * this.rows;
    this.start = new Int32Array(this.n + 1);
    this.cellOf = new Int32Array(capacity);
    this.order = new Int32Array(capacity);
  }
  build(x, y, count) {
    const { cols, rows, invW, invH, start, cellOf, order } = this;
    start.fill(0);
    for (let i = 0; i < count; i++) {
      let cx = (x[i] * invW) | 0; if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
      let cy = (y[i] * invH) | 0; if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
      const c = cy * cols + cx;
      cellOf[i] = c;
      start[c + 1]++;
    }
    for (let c = 0; c < this.n; c++) start[c + 1] += start[c];
    const cursor = this._cursor || (this._cursor = new Int32Array(this.n));
    cursor.set(start.subarray(0, this.n));
    for (let i = 0; i < count; i++) order[cursor[cellOf[i]]++] = i;
  }
}
