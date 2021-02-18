Files in this directory should have a default export that is a React-renderables that can be passed to react-router.

i.e. it shouldn't require any particular props, or if it does, they should be the ones that react-router pass to it. Even better to avoid props, and just use the right react hooks to read router state.
