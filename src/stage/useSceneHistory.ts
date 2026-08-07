import { useCallback, useRef, useState } from 'react';
import type { Scene } from './sceneModel';

/* Отмена — первое, что практик пробует после неудачного движения мышью.
 *
 * Снимок делается НА НАЧАЛО действия, а не на каждое изменение: перетаскивание
 * шлёт десятки обновлений в секунду, и запись каждого превратила бы отмену в
 * покадровую перемотку. Поэтому у состояния два входа: `set` — живое движение
 * без записи, `snapshot()` — «сейчас начнётся действие, запомни как было».
 *
 * Текущая сцена продублирована в ref, и это не оптимизация: `snapshot()`
 * вызывают из обработчика события, где значение нужно ПРЯМО СЕЙЧАС. Через
 * функциональный апдейтер оно приходит позже самого вызова, и счётчик глубины
 * успевал прочитать пустую стопку — кнопка отмены оставалась серой после
 * настоящего перетаскивания.
 */

const LIMIT = 80;

export interface SceneHistory {
  scene: Scene;
  /** Живое обновление без записи в историю. */
  set: (next: Scene | ((prev: Scene) => Scene)) => void;
  /** Отметить начало действия: текущее состояние уходит в стопку отмены. */
  snapshot: () => void;
  /** Снимок и изменение одним вызовом — для дискретных действий. */
  commit: (next: Scene | ((prev: Scene) => Scene)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Заменить сцену целиком без права отменить (загрузка по ссылке, сброс). */
  reset: (next: Scene) => void;
}

export function useSceneHistory(initial: Scene): SceneHistory {
  const [scene, setSceneState] = useState<Scene>(initial);
  const current = useRef<Scene>(initial);
  const past = useRef<Scene[]>([]);
  const future = useRef<Scene[]>([]);
  const [depth, setDepth] = useState({ past: 0, future: 0 });

  const write = useCallback((next: Scene) => {
    current.current = next;
    setSceneState(next);
  }, []);

  const resolve = (next: Scene | ((prev: Scene) => Scene)): Scene =>
    typeof next === 'function' ? (next as (p: Scene) => Scene)(current.current) : next;

  const sync = useCallback(() => {
    setDepth({ past: past.current.length, future: future.current.length });
  }, []);

  const push = useCallback(
    (value: Scene) => {
      past.current = [...past.current.slice(-(LIMIT - 1)), value];
      // Новая ветка обесценивает отменённое: иначе «вперёд» вернуло бы
      // состояние из истории, которой больше нет.
      future.current = [];
    },
    [],
  );

  const snapshot = useCallback(() => {
    push(current.current);
    sync();
  }, [push, sync]);

  const set = useCallback(
    (next: Scene | ((prev: Scene) => Scene)) => {
      write(resolve(next));
    },
    [write],
  );

  const commit = useCallback(
    (next: Scene | ((prev: Scene) => Scene)) => {
      push(current.current);
      write(resolve(next));
      sync();
    },
    [push, write, sync],
  );

  const undo = useCallback(() => {
    const previous = past.current[past.current.length - 1];
    if (!previous) return;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, current.current];
    write(previous);
    sync();
  }, [write, sync]);

  const redo = useCallback(() => {
    const next = future.current[future.current.length - 1];
    if (!next) return;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, current.current];
    write(next);
    sync();
  }, [write, sync]);

  const reset = useCallback(
    (next: Scene) => {
      past.current = [];
      future.current = [];
      write(next);
      sync();
    },
    [write, sync],
  );

  return {
    scene,
    set,
    snapshot,
    commit,
    undo,
    redo,
    canUndo: depth.past > 0,
    canRedo: depth.future > 0,
    reset,
  };
}
