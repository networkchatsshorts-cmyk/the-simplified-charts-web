'use client';

import { useEffect, useState } from 'react';
import CommunityPost from '@/components/CommunityPost';
import SearchAndPaginate from '@/components/SearchAndPaginate';

type Category =
  | 'learning'
  | 'stocks-to-watch-next-week';

type Post = {
  id: string;
  title: string;
  slug: string;
  body: string;
  image_urls: string[];
  published: boolean;
  youtube_post_url?: string | null;
  created_at: string;
  updated_at?: string | null;
  category: Category;
};

const CATEGORY_LABELS: Record<Category, string> = {
  learning: 'Learning',
  'stocks-to-watch-next-week':
    'Stocks to watch next week',
};

const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  learning:
    'Educational posts, chart breakdowns and lessons from The Simplified Charts.',
  'stocks-to-watch-next-week':
    'Weekly watchlist posts covering stocks and setups worth tracking.',
};

function categoryFromHash(): Category {
  if (
    typeof window !== 'undefined' &&
    window.location.hash ===
      '#stocks-to-watch-next-week'
  ) {
    return 'stocks-to-watch-next-week';
  }

  return 'learning';
}

export default function CommunitySections({
  posts,
}: {
  posts: Post[];
}) {
  const [activeCategory, setActiveCategory] =
    useState<Category>(() =>
      categoryFromHash()
    );

  function selectCategory(category: Category) {
    setActiveCategory(category);

    if (typeof window !== 'undefined') {
      const hash =
        category === 'learning'
          ? '#learning'
          : '#stocks-to-watch-next-week';

      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${hash}`
      );
    }
  }

  useEffect(() => {
    function handleHashChange() {
      setActiveCategory(categoryFromHash());
    }

    window.addEventListener(
      'hashchange',
      handleHashChange
    );

    return () => {
      window.removeEventListener(
        'hashchange',
        handleHashChange
      );
    };
  }, []);

  const learningPosts = posts.filter(
    post => post.category === 'learning'
  );

  const watchPosts = posts.filter(
    post =>
      post.category ===
      'stocks-to-watch-next-week'
  );

  return (
    <section className="communitySections">
      {/* =========================================
          COMMUNITY HEADING
          No arrow here.
          ========================================= */}
      <section className="hero">
        <div className="eyebrow">
          The Simplified Charts
        </div>

        <h1>Community</h1>

        <p className="lead">
          Market observations, charts, updates and
          discussions from the channel. Open a post
          to read and join the conversation.
        </p>
      </section>

      {/* =========================================
          ONLY TWO SECTION CARDS
          ========================================= */}
      <div
        className="communityCategoryTabs"
        role="tablist"
        aria-label="Community sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            activeCategory === 'learning'
          }
          className={`communityCategoryTab ${
            activeCategory === 'learning'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            selectCategory('learning')
          }
        >
          <span className="tabIcon">
            📘
          </span>

          <span className="tabText">
            <strong>Learning</strong>

            <small>
              Educational posts & lessons
            </small>
          </span>

          {activeCategory === 'learning' && (
            <span
              className="selectedBadge"
              aria-label="Selected"
            >
              ✓
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            activeCategory ===
            'stocks-to-watch-next-week'
          }
          className={`communityCategoryTab ${
            activeCategory ===
            'stocks-to-watch-next-week'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            selectCategory(
              'stocks-to-watch-next-week'
            )
          }
        >
          <span className="tabIcon">
            📈
          </span>

          <span className="tabText">
            <strong>
              Stocks to watch next week
            </strong>

            <small>
              Weekly watchlist & setups
            </small>
          </span>

          {activeCategory ===
            'stocks-to-watch-next-week' && (
            <span
              className="selectedBadge"
              aria-label="Selected"
            >
              ✓
            </span>
          )}
        </button>
      </div>

      {/* =========================================
          LEARNING CONTENT
          ========================================= */}
      <section
        id="learning"
        className={`communityActiveSection ${
          activeCategory === 'learning'
            ? 'sectionVisible'
            : 'sectionHidden'
        }`}
        aria-hidden={
          activeCategory !== 'learning'
        }
      >
        <div className="communityActiveHeader">
          <div>
            <div className="eyebrow">
              Learning
            </div>

            <h2>Learning</h2>

            <p className="small">
              {CATEGORY_DESCRIPTIONS.learning}
            </p>
          </div>
        </div>

        <SearchAndPaginate
          placeholder="Search community post"
          emptyMessage="No Learning posts yet."
          itemsLabel="Posts"
        >
          {learningPosts.map(post => {
            const searchText = [
              post.title,
              post.body,
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={post.id}
                data-search-item
                data-search-text={searchText}
              >
                <CommunityPost post={post} />
              </div>
            );
          })}

          {!learningPosts.length && (
            <div className="card">
              <div className="cardbody">
                <h3>
                  No Learning posts yet
                </h3>

                <p className="small">
                  New posts will appear here.
                </p>
              </div>
            </div>
          )}
        </SearchAndPaginate>
      </section>

      {/* =========================================
          STOCKS TO WATCH NEXT WEEK
          ========================================= */}
      <section
        id="stocks-to-watch-next-week"
        className={`communityActiveSection ${
          activeCategory ===
          'stocks-to-watch-next-week'
            ? 'sectionVisible'
            : 'sectionHidden'
        }`}
        aria-hidden={
          activeCategory !==
          'stocks-to-watch-next-week'
        }
      >
        <div className="communityActiveHeader">
          <div>
            <div className="eyebrow">
              Stocks to watch next week
            </div>

            <h2>
              Stocks to watch next week
            </h2>

            <p className="small">
              {
                CATEGORY_DESCRIPTIONS[
                  'stocks-to-watch-next-week'
                ]
              }
            </p>
          </div>
        </div>

        <SearchAndPaginate
          placeholder="Search community post"
          emptyMessage="No Stocks to watch next week posts yet."
          itemsLabel="Posts"
        >
          {watchPosts.map(post => {
            const searchText = [
              post.title,
              post.body,
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={post.id}
                data-search-item
                data-search-text={searchText}
              >
                <CommunityPost post={post} />
              </div>
            );
          })}

          {!watchPosts.length && (
            <div className="card">
              <div className="cardbody">
                <h3>
                  No Stocks to watch next week posts yet
                </h3>

                <p className="small">
                  New weekly watchlist posts will
                  appear here.
                </p>
              </div>
            </div>
          )}
        </SearchAndPaginate>
      </section>

      <style jsx>{`
        .communitySections {
          width: 100%;
        }

        /* =========================================
           TWO CATEGORY CARDS
           ========================================= */

        .communityCategoryTabs {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 12px;

          margin-bottom: 30px;
        }

        .communityCategoryTab {
          position: relative;

          display: flex;
          align-items: center;
          gap: 13px;

          min-height: 84px;

          padding: 16px 54px 16px 18px;

          border: 1px solid
            rgba(15, 23, 42, 0.12);

          border-radius: 15px;

          background: #ffffff;
          color: inherit;

          text-align: left;

          cursor: pointer;

          transition:
            transform 0.16s ease,
            border-color 0.16s ease,
            background 0.16s ease,
            box-shadow 0.16s ease;
        }

        .communityCategoryTab:hover {
          transform: translateY(-1px);

          box-shadow:
            0 8px 24px
              rgba(15, 23, 42, 0.08);
        }

        /* =========================================
           SELECTED = LIGHT YELLOW
           ========================================= */

        .communityCategoryTab.active {
          border-color:
            rgba(202, 138, 4, 0.48);

          background:
            rgba(250, 204, 21, 0.12);

          box-shadow:
            0 8px 26px
              rgba(202, 138, 4, 0.10);

          transform: translateY(-1px);
        }

        .tabIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          flex: 0 0 auto;

          width: 42px;
          height: 42px;

          border-radius: 11px;

          background:
            rgba(15, 23, 42, 0.07);

          font-size: 20px;
        }

        .communityCategoryTab.active
          .tabIcon {
          background:
            rgba(250, 204, 21, 0.20);
        }

        .tabText {
          min-width: 0;
        }

        .tabText strong,
        .tabText small {
          display: block;
        }

        .tabText strong {
          margin-bottom: 3px;

          font-size: 15px;
          line-height: 1.3;
        }

        .tabText small {
          font-size: 13px;
          line-height: 1.4;

          opacity: 0.68;
        }

        /* =========================================
           SELECTED CHECK
           ========================================= */

        .selectedBadge {
          position: absolute;

          top: 50%;
          right: 17px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          width: 29px;
          height: 29px;

          border-radius: 50%;

          background:
            rgba(15, 23, 42, 0.92);

          color: #ffffff;

          font-size: 15px;
          font-weight: 800;

          transform: translateY(-50%);
        }

        /* =========================================
           CONTENT
           ========================================= */

        .communityActiveSection {
          margin-top: 30px;
        }

        .communityActiveSection.sectionVisible {
          display: block;
        }

        .communityActiveSection.sectionHidden {
          display: none;
        }

        .communityActiveHeader {
          margin-bottom: 18px;
        }

        .communityActiveHeader h2 {
          margin-top: 7px;
          margin-bottom: 5px;
        }

        .communityActiveHeader p {
          margin-bottom: 0;
        }

        /* =========================================
           MOBILE
           ========================================= */

        @media (max-width: 700px) {
          .communityCategoryTabs {
            grid-template-columns: 1fr;

            gap: 10px;

            margin-bottom: 24px;
          }

          .communityCategoryTab {
            min-height: 74px;

            padding:
              14px 50px 14px 15px;
          }

          .tabIcon {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </section>
  );
}
