const relayStateByController = new Map();

export function normalizeRole(role) {
  return role === "USER" ? "CLIENT" : role;
}

export function presentRole(role) {
  return role === "CLIENT" ? "USER" : role;
}

export function presentUser(user) {
  if (!user) return user;

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { ...safeUser, role: presentRole(safeUser.role) };
}

export function normalizeControllerInput(data = {}) {
  const normalized = { ...data };

  if (Object.hasOwn(normalized, "temp")) {
    normalized.temperature = normalized.temp;
    delete normalized.temp;
  }
  if (Object.hasOwn(normalized, "switchAmps")) {
    normalized.switchCurrentCapacity = normalized.switchAmps;
    delete normalized.switchAmps;
  }
  delete normalized.operativeStatus;

  return normalized;
}

export function setRelayState(controllerId, relayState) {
  if (relayState === "ON" || relayState === "OFF") {
    relayStateByController.set(controllerId, relayState);
  }
}

export function getRelayState(controllerId) {
  return relayStateByController.get(controllerId) || "OFF";
}

export function clearRelayState(controllerId) {
  relayStateByController.delete(controllerId);
}

export function presentController(controller, { hideControllerId = false } = {}) {
  if (!controller) return controller;

  const {
    deviceSecretHash: _deviceSecretHash,
    pairingPinHash: _pairingPinHash,
    temperature,
    switchCurrentCapacity,
    user,
    kiln,
    controllerId,
    ...safeController
  } = controller;

  return {
    ...safeController,
    ...(hideControllerId ? {} : { controllerId }),
    temp: temperature,
    switchAmps: switchCurrentCapacity,
    operativeStatus: getRelayState(controllerId),
    ...(user === undefined ? {} : { user: presentUser(user) }),
    ...(kiln === undefined ? {} : { kiln: presentKiln(kiln) }),
  };
}

export function normalizeKilnInput(data = {}) {
  const normalized = { ...data };
  const aliases = [
    ["phases", "phaseCount"],
    ["volts", "nominalVoltage"],
    ["amps", "nominalCurrent"],
  ];

  for (const [legacy, canonical] of aliases) {
    if (Object.hasOwn(normalized, legacy)) {
      normalized[canonical] = normalized[legacy];
      delete normalized[legacy];
    }
  }

  return normalized;
}

export function presentKiln(kiln) {
  if (!kiln) return kiln;

  const {
    phaseCount,
    nominalVoltage,
    nominalCurrent,
    controller,
    user,
    ...safeKiln
  } = kiln;

  return {
    ...safeKiln,
    phases: phaseCount,
    volts: nominalVoltage,
    amps: nominalCurrent,
    ...(controller === undefined
      ? {}
      : { controller: presentController(controller) }),
    ...(user === undefined ? {} : { user: presentUser(user) }),
  };
}
