import Debug "mo:base/Debug";
import Error "mo:base/Error";

actor {

  func doTrap (n:Nat) {
     if (n <= 0)
       { Debug.trap("trapping") }
     else {
       doTrap (n - 1);
     };
     Debug.print (debug_show {doTrap = n}); // prevent TCO
  };

  public func test() : async () {
    doTrap(10);
  };

  public func Throw() : async () {
     throw Error.reject("foo");
  }

};
