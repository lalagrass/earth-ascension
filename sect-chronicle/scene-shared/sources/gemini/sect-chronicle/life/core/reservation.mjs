// reservation.mjs
// 通用預約守恆器 (ReservationBroker，防雙花、防站位衝突、防超容)

export class ReservationBroker {
  constructor() {
    this.stations = new Map(); // stationId -> actorId
    this.materialReservations = new Map(); // sourceKey -> Map(actorId -> amount)
    this.destReservations = new Map(); // destKey -> Map(actorId -> amount)
  }

  // 1. 站位排他鎖 (Station Exclusive Lock)
  isStationFree(stationId, actorId = null) {
    const current = this.stations.get(stationId);
    return current == null || current === actorId;
  }

  reserveStation(stationId, actorId) {
    const current = this.stations.get(stationId);
    if (current && current !== actorId) {
      return { ok: false, reason: 'STATION_BUSY', owner: current };
    }
    this.stations.set(stationId, actorId);
    return { ok: true };
  }

  releaseStation(stationId, actorId = null) {
    const current = this.stations.get(stationId);
    if (!current) return true;
    if (actorId == null || current === actorId) {
      this.stations.delete(stationId);
      return true;
    }
    return false;
  }

  // 2. 原料在途預約鎖 (Material In-Flight Lock)
  getReservedMaterial(sourceKey) {
    const resMap = this.materialReservations.get(sourceKey);
    if (!resMap) return 0;
    let sum = 0;
    for (const amt of resMap.values()) {
      sum += amt;
    }
    return sum;
  }

  reserveMaterial(sourceKey, amount, actorId, getAvailableStock) {
    const reserved = this.getReservedMaterial(sourceKey);
    const available = typeof getAvailableStock === 'function'
      ? getAvailableStock(sourceKey)
      : getAvailableStock;

    if (available - reserved < amount) {
      return { ok: false, reason: 'LACK_OF_MATERIAL' };
    }

    if (!this.materialReservations.has(sourceKey)) {
      this.materialReservations.set(sourceKey, new Map());
    }
    const map = this.materialReservations.get(sourceKey);
    const cur = map.get(actorId) || 0;
    map.set(actorId, cur + amount);
    return { ok: true };
  }

  releaseMaterial(sourceKey, amount = null, actorId = null) {
    const map = this.materialReservations.get(sourceKey);
    if (!map) return;
    if (actorId == null) {
      this.materialReservations.delete(sourceKey);
      return;
    }
    if (!map.has(actorId)) return;
    if (amount == null) {
      map.delete(actorId);
    } else {
      const cur = map.get(actorId);
      if (cur <= amount) {
        map.delete(actorId);
      } else {
        map.set(actorId, cur - amount);
      }
    }
    if (map.size === 0) {
      this.materialReservations.delete(sourceKey);
    }
  }

  // 3. 目的地容量預約鎖 (Destination Capacity Lock)
  getReservedDestination(destKey) {
    const resMap = this.destReservations.get(destKey);
    if (!resMap) return 0;
    let sum = 0;
    for (const amt of resMap.values()) {
      sum += amt;
    }
    return sum;
  }

  reserveDestination(destKey, amount, actorId, getRemainingCapacity) {
    const reserved = this.getReservedDestination(destKey);
    const remaining = typeof getRemainingCapacity === 'function'
      ? getRemainingCapacity(destKey)
      : getRemainingCapacity;

    if (remaining - reserved < amount) {
      return { ok: false, reason: 'DESTINATION_FULL' };
    }

    if (!this.destReservations.has(destKey)) {
      this.destReservations.set(destKey, new Map());
    }
    const map = this.destReservations.get(destKey);
    const cur = map.get(actorId) || 0;
    map.set(actorId, cur + amount);
    return { ok: true };
  }

  releaseDestination(destKey, amount = null, actorId = null) {
    const map = this.destReservations.get(destKey);
    if (!map) return;
    if (actorId == null) {
      this.destReservations.delete(destKey);
      return;
    }
    if (!map.has(actorId)) return;
    if (amount == null) {
      map.delete(actorId);
    } else {
      const cur = map.get(actorId);
      if (cur <= amount) {
        map.delete(actorId);
      } else {
        map.set(actorId, cur - amount);
      }
    }
    if (map.size === 0) {
      this.destReservations.delete(destKey);
    }
  }

  // 4. 清除特定角色的所有預約鎖 (onCleanup 使用)
  clearActor(actorId) {
    for (const [stationId, currentActor] of this.stations.entries()) {
      if (currentActor === actorId) {
        this.stations.delete(stationId);
      }
    }
    for (const [sourceKey, map] of this.materialReservations.entries()) {
      map.delete(actorId);
      if (map.size === 0) {
        this.materialReservations.delete(sourceKey);
      }
    }
    for (const [destKey, map] of this.destReservations.entries()) {
      map.delete(actorId);
      if (map.size === 0) {
        this.destReservations.delete(destKey);
      }
    }
  }

  // 序列化快照
  snapshot() {
    return {
      stations: Object.fromEntries(this.stations.entries()),
      materialReservations: Object.fromEntries(
        Array.from(this.materialReservations.entries()).map(([k, m]) => [k, Object.fromEntries(m.entries())])
      ),
      destReservations: Object.fromEntries(
        Array.from(this.destReservations.entries()).map(([k, m]) => [k, Object.fromEntries(m.entries())])
      ),
    };
  }

  restore(snap) {
    this.stations = new Map(Object.entries(snap.stations || {}));
    this.materialReservations = new Map(
      Object.entries(snap.materialReservations || {}).map(([k, obj]) => [k, new Map(Object.entries(obj))])
    );
    this.destReservations = new Map(
      Object.entries(snap.destReservations || {}).map(([k, obj]) => [k, new Map(Object.entries(obj))])
    );
  }
}
