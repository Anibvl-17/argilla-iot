const relayStateByController = new Map();

export function setSwitchState(controllerId, switchState) {
  const normalized = String(switchState || "").toUpperCase();
  if (normalized === "ON" || normalized === "OFF") {
    relayStateByController.set(controllerId, normalized === "ON");
  }
}

export function getSwitchState(controllerId) {
  return relayStateByController.get(controllerId) ?? false;
}

export function clearSwitchState(controllerId) {
  relayStateByController.delete(controllerId);
}

export function presentUser(user) {
  if (!user) return user;
  const {
    passwordHash: _passwordHash,
    country: _country,
    commune,
    ...safeUser
  } = user;
  return {
    ...safeUser,
    ...(commune === undefined ? {} : { regionId: commune?.regionId ?? null }),
  };
}

export function presentController(
  controller,
  { hideControllerId = false } = {},
) {
  if (!controller) return controller;

  const {
    deviceSecretHash: _deviceSecretHash,
    pairingPinHash: _pairingPinHash,
    controllerId,
    user,
    kiln,
    ...safeController
  } = controller;

  return {
    ...safeController,
    ...(hideControllerId ? {} : { controllerId }),
    controllerCode: controllerId.slice(-6),
    switchState: getSwitchState(controllerId),
    ...(user === undefined ? {} : { user: presentUser(user) }),
    ...(kiln === undefined ? {} : { kiln: presentKiln(kiln) }),
  };
}

export function presentKiln(kiln) {
  if (!kiln) return kiln;
  const { controller, user, _count, ...safeKiln } = kiln;
  return {
    ...safeKiln,
    ...(_count?.firingCycles === undefined
      ? {}
      : { firingCycleCount: _count.firingCycles }),
    ...(controller === undefined
      ? {}
      : { controller: presentController(controller) }),
    ...(user === undefined ? {} : { user: presentUser(user) }),
  };
}
