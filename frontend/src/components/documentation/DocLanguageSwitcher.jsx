import { useLanguage } from '../../contexts/LanguageContext'
import styles from './DocLanguageSwitcher.module.css'

export default function DocLanguageSwitcher() {
  const { language, toggleLanguage } = useLanguage()

  return (
    <button className={styles.switcher} onClick={toggleLanguage} title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}>
      <span className={styles.flag}>
        {language === 'ar' ? '🇸🇦' : '🇬🇧'}
      </span>
      <span className={styles.text}>
        {language === 'ar' ? 'English' : 'العربية'}
      </span>
    </button>
  )
}
