// @ts-ignore
import authDemoCanister from "ic:canisters/authentication_demo";
import { Actor } from "@dfinity/agent";

// const authentication_demo = Actor.canisterIdOf(authDemoCanister)
export const authentication_demo: Actor = authDemoCanister;
