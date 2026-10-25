import story from './data/story.json';

// Runs the story from src/data/story.json, one step at a time.
// Each step is a dialogue scene, a battle, or the end.
//
// startStep(scene, 3) means "go and play step number 3". Steps are counted
// from 0, so step 0 is the first one in the list.
// "scene" is whichever Phaser scene is calling this (we use it to switch screens).
export function startStep(scene, index) {
  const step = story.steps[index];

  // Past the end of the list, or an "end" step: show the end screen
  if (!step || step.type === 'end') {
    scene.scene.start('EndScene');
    return;
  }

  if (step.type === 'dialogue') {
    scene.scene.start('DialogueScene', { stepIndex: index, sceneId: step.scene });
  } else if (step.type === 'battle') {
    scene.scene.start('BattleScene', { stepIndex: index });
  } else {
    // A step type we do not know: say so, and skip it so the game keeps going
    console.warn('story.json: unknown step type "' + step.type + '" at step ' + index);
    startStep(scene, index + 1);
  }
}
