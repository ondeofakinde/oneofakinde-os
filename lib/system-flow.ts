import type { Route } from "next";
import { routes } from "@/lib/routes";

export type EntryFlowTargets = {
  finalReturnTo: Route;
  profileSetupReturnTo: Route;
  walletConnectReturnTo: Route;
  signInHref: Route;
  signUpHref: Route;
  walletConnectHref: Route;
};

export function buildDefaultEntryFlow(finalReturnTo: Route = routes.townhall()): EntryFlowTargets {
  const profileSetupReturnTo = routes.profileSetup(finalReturnTo);
  const walletConnectReturnTo = routes.walletConnect(profileSetupReturnTo);

  return {
    finalReturnTo,
    profileSetupReturnTo,
    walletConnectReturnTo,
    signInHref: routes.signIn(walletConnectReturnTo),
    signUpHref: routes.signUp(finalReturnTo),
    walletConnectHref: walletConnectReturnTo
  };
}
