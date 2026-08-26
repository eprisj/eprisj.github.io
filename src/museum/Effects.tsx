import { EffectComposer, N8AO, SMAA } from '@react-three/postprocessing';

/* ПОСТОБРАБОТКА ОТДЕЛЬНЫМ ЧАНКОМ.
 *
 * Ambient occlusion — та самая грязь в углах, которой не даёт расчёт по
 * источникам света: под консолью, в кессонах, между рёбрами и в стыке массы
 * с цоколем. Без неё бетон выглядит вырезанным из бумаги, сколько света ни
 * ставь. SMAA снимает лестницы с длинных рёбер, а их здесь сотни.
 *
 * Стоит это 155 КБ в gzip, поэтому файл вынесен и грузится лениво: телефон,
 * где макет и так размером с ладонь, не платит за эффект, который на нём
 * почти не виден. Решение принимает MuseumModel по ширине холста.
 */
export default function Effects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <N8AO aoRadius={1.9} intensity={2.1} distanceFalloff={0.85} quality="medium" color="#2f2b25" />
      <SMAA />
    </EffectComposer>
  );
}
