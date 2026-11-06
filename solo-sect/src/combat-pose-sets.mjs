// Data only: combat pose choices are shared by data initialization and display routines.
export const COMBAT_MOVE_SETS = {
  fist: [['ready', 'leftStep', 'rightFist'], ['ready', 'rightStep', 'leftFist'], ['block', 'sink', 'doubleFist'], ['ready', 'leftElbow', 'rightFist']],
  palm: [['ready', 'leftStep', 'rightPalm'], ['block', 'rightStep', 'leftPalm'], ['sink', 'wing', 'doublePalm'], ['ready', 'lowPalm', 'highPalm']],
  leg: [['ready', 'wing', 'rightKick'], ['ready', 'leftStep', 'leftKick'], ['block', 'rightStep', 'rightKick'], ['ready', 'crouch', 'leftKick']],
  sword: [['swordReady', 'leftStep', 'swordCut'], ['swordReady', 'rightStep', 'swordThrust'], ['swordReady', 'wing', 'swordCut'], ['swordReady', 'block', 'swordThrust']],
  blade: [['bladeReady', 'rightStep', 'bladeCut'], ['bladeReady', 'leftStep', 'bladeCut'], ['bladeReady', 'wing', 'bladeCut'], ['bladeReady', 'block', 'bladeCut']],
  staff: [['staffReady', 'leftStep', 'staffThrust'], ['staffReady', 'rightStep', 'staffThrust'], ['staffReady', 'wing', 'staffThrust'], ['staffReady', 'block', 'staffThrust']],
};
