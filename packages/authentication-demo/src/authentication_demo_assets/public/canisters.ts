// @ts-expect-error because 'ic:canisters' is not resolvable without custom linker configuration in webpack.config.js
import authDemoCanister from "ic:canisters/authentication_demo";
import { Actor } from "@dfinity/agent";

// const authentication_demo = Actor.canisterIdOf(authDemoCanister)
export const authentication_demo: Actor = authDemoCanister;
