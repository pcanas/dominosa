import { TutorialScreen } from '@/ui/tutorial/TutorialScreen';

/** The tutorial the first time the app opens, from the welcome screen's "Learn to play". */
export default function LearnRoute() {
  return <TutorialScreen mode="first" />;
}
