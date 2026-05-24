import Link from 'next/link';
import styles from './PolicyPage.module.css';

interface PolicySection {
  title: string;
  body?: string;
  items?: string[];
}

interface PolicyPageProps {
  eyebrow: string;
  title: string;
  updated: string;
  notice?: string;
  sections: PolicySection[];
}

export default function PolicyPage({ eyebrow, title, updated, notice, sections }: PolicyPageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.brand}>
            Gmail Organizer
          </Link>
          <Link href="/" className={styles.backLink}>
            Back to app
          </Link>
        </nav>

        <article className={styles.card}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.updated}>Last updated: {updated}</p>

          <div className={styles.content}>
            {notice && <p className={styles.notice}>{notice}</p>}

            {sections.map((section) => (
              <section className={styles.section} key={section.title}>
                <h2>{section.title}</h2>
                {section.body && <p>{section.body}</p>}
                {section.items && (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
