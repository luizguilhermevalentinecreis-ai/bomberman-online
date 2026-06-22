// ─── Socket Client Wrapper ────────────────────────────────────────────────────

const GameSocket = (() => {
  let socket = null;
  const handlers = {};

  function connect() {
    socket = io();
    socket.onAny((event, ...args) => {
      if (handlers[event]) handlers[event].forEach(fn => fn(...args));
    });
  }

  function on(event, fn) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(fn);
  }

  function off(event, fn) {
    if (!handlers[event]) return;
    handlers[event] = handlers[event].filter(f => f !== fn);
  }

  function emit(event, data) {
    if (socket) socket.emit(event, data);
  }

  function id() { return socket?.id; }

  return { connect, on, off, emit, id };
})();
