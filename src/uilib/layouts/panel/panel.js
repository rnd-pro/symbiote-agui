import { UiComponent } from '../../shared/component.js';
import styles from './styles.js';

export class Panel extends UiComponent {
  processInnerHtml = true;
}

Panel.rootStyles = styles;
