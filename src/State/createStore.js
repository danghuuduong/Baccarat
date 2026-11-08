function createStore(initial) {
    const state = { ...initial };
    const listeners = new Set();

    function get(key) {
        return key === undefined ? { ...state } : state[key];
    }

    function set(keyOrObj, value) {
        const patch = typeof keyOrObj === "object" ? keyOrObj : { [keyOrObj]: value };
        for (const [k, v] of Object.entries(patch)) {
            state[k] = typeof v === "function" ? v(state[k]) : v;
        }
        listeners.forEach((fn) => fn(state, patch));
    }

    // Thay toàn bộ state bằng object mới
    function replace(newState) {
        for (const k of Object.keys(state)) delete state[k];
        Object.assign(state, newState);
        listeners.forEach((fn) => fn(state, newState));
    }

    // Về lại giá trị ban đầu
    function reset() {
        replace(structuredClone(initial));
    }

    function subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    return { get, set, replace, reset, subscribe };
}

module.exports = { createStore };