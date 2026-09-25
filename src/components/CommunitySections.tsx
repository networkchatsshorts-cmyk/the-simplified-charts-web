'use client';

import { useState } from 'react';
import CommunityPost from '@/components/CommunityPost';
import SearchAndPaginate from '@/components/SearchAndPaginate';

type Category = 'learning' | 'stocks-to-watch-next-week';

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
  'stocks-to-watch-next-week': 'Stocks to watch next week',
};

const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  learning:
    'Educational posts, chart breakdowns and lessons from The Simplified Charts.',
  'stocks-to-watch-next-week':
    'Weekly watchlist posts covering stocks and setups worth tracking.',
};

export default function CommunitySections({
  posts,
}: {
  posts: Post[];
}) {
  const [activeCategory, setActiveCategory] =
    useState<Category>('learning');

  const [menuOpen, setMenuOpen] = useState(false);

  const learningPosts = posts.filter(
    post => post.category === 'learning'
  );

  const watchPosts = posts.filter(
    post =>
      post.category === 'stocks-to-watch-next-week'
  );

  const activePosts =
    activeCategory === 'learning'
      ? learningPosts
      : watchPosts;

  function selectCategory(category: Category) {
    setActiveCategory(category);
    setMenuOpen(false);
  }

  return (
    <section className="communitySectionChooser">
      {/* Community heading + hover/tap menu */}
      <div
        className="communityTitleMenu"
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
      >
        <button
          type="button"
          className="communityTitleButton"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen(prev => !prev)}
        >
          <span>Community</span>
          <span
            className={`communityTitleArrow ${
              menuOpen ? 'open' : ''
            }`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>

        {menuOpen && (
          <div
            className="communityTopMenu"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className={`communityTopOption ${
                activeCategory === 'learning'
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                selectCategory('learning')
              }
            >
              <span className="communityOptionIcon">
                📘
              </span>

              <span>
                <strong>Learning</strong>
                <small>
                  Educational posts & chart lessons
                </small>
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              className={`communityTopOption ${
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
              <span className="communityOptionIcon">
                📈
              </span>

              <span>
                <strong>
                  Stocks to watch next week
                </strong>
                <small>
                  Weekly watchlist & setups
                </small>
              </span>
            </button>
          </div>
        )}
      </div>

      <p className="lead">
        Market observations, charts, updates and
        discussions from the channel. Open a post to
        read and join the conversation.
      </p>

      {/* Prominent category selector */}
      <div className="communityCategoryArea">
        <div className="communityCategoryLabel">
          <span className="communityCategoryEyebrow">
            Explore Community
          </span>

          <span className="communityCategoryHint">
            Choose a section
          </span>
        </div>

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
            <span className="tabIcon">📘</span>

            <span className="tabText">
              <strong>Learning</strong>
              <small>
                Educational posts & lessons
              </small>
            </span>
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
            <span className="tabIcon">📈</span>

            <span className="tabText">
              <strong>
                Stocks to watch next week
              </strong>
              <small>
                Weekly watchlist & setups
              </small>
            </span>
          </button>
        </div>
      </div>

      {/* Active section */}
      <section className="communityActiveSection">
        <div className="communityActiveHeader">
          <div>
            <div className="eyebrow">
              {CATEGORY_LABELS[activeCategory]}
            </div>

            <h2>
              {CATEGORY_LABELS[activeCategory]}
            </h2>

            <p className="small">
              {CATEGORY_DESCRIPTIONS[activeCategory]}
            </p>
          </div>
        </div>

        <SearchAndPaginate
          placeholder="Search community post"
          emptyMessage={`No ${CATEGORY_LABELS[
            activeCategory
          ].toLowerCase()} posts yet.`}
          itemsLabel="Posts"
        >
          {activePosts.map(post => {
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

          {!activePosts.length && (
            <div className="card">
              <div className="cardbody">
                <h3>
                  No posts in this section yet
                </h3>

                <p className="small">
                  New posts will appear here.
                </p>
              </div>
            </div>
          )}
        </SearchAndPaginate>
      </section>

      <style jsx>{`
        .communitySectionChooser {
          width: 100%;
        }

        .communityTitleMenu {
          position: relative;
          display: inline-block;
          margin-bottom: 4px;
        }

        .communityTitleButton {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          line-height: 1.05;
          cursor: pointer;
        }

        .communityTitleArrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          font-size: 18px;
          transition:
            transform 0.18s ease,
            background 0.18s ease;
        }

        .communityTitleButton:hover
          .communityTitleArrow,
        .communityTitleArrow.open {
          background: rgba(15, 23, 42, 0.08);
        }

        .communityTitleArrow.open {
          transform: rotate(180deg);
        }

        .communityTopMenu {
          position: absolute;
          top: calc(100% + 12px);
          left: 0;
          z-index: 100;
          width: min(410px, calc(100vw - 32px));
          padding: 10px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow:
            0 18px 50px rgba(15, 23, 42, 0.16);
          backdrop-filter: blur(10px);
        }

        .communityTopOption {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
          padding: 13px 14px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .communityTopOption:hover,
        .communityTopOption.active {
          border-color: rgba(15, 23, 42, 0.12);
          background: rgba(15, 23, 42, 0.05);
        }

        .communityOptionIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.07);
          font-size: 17px;
        }

        .communityTopOption strong,
        .communityTopOption small {
          display: block;
        }

        .communityTopOption strong {
          margin-bottom: 3px;
          font-size: 15px;
        }

        .communityTopOption small {
          font-size: 13px;
          line-height: 1.4;
          opacity: 0.72;
        }

        .communityCategoryArea {
          margin-top: 26px;
          padding: 20px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.78);
        }

        .communityCategoryLabel {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .communityCategoryEyebrow {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.68;
        }

        .communityCategoryHint {
          font-size: 13px;
          opacity: 0.62;
        }

        .communityCategoryTabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .communityCategoryTab {
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 78px;
          padding: 15px 17px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 14px;
          background: #fff;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            transform 0.16s ease,
            border-color 0.16s ease,
            box-shadow 0.16s ease;
        }

        .communityCategoryTab:hover {
          transform: translateY(-1px);
          box-shadow:
            0 8px 24px rgba(15, 23, 42, 0.08);
        }

        .communityCategoryTab.active {
          border-color: rgba(15, 23, 42, 0.4);
          box-shadow:
            0 8px 26px rgba(15, 23, 42, 0.1);
        }

        .tabIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          width: 40px;
          height: 40px;
          border-radius: 11px;
          background: rgba(15, 23, 42, 0.07);
          font-size: 19px;
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
        }

        .tabText small {
          font-size: 13px;
          line-height: 1.4;
          opacity: 0.68;
        }

        .communityActiveSection {
          margin-top: 30px;
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

        @media (max-width: 700px) {
          .communityTopMenu {
            width: min(360px, calc(100vw - 28px));
          }

          .communityCategoryArea {
            padding: 14px;
          }

          .communityCategoryLabel {
            display: block;
          }

          .communityCategoryHint {
            display: block;
            margin-top: 4px;
          }

          .communityCategoryTabs {
            grid-template-columns: 1fr;
          }

          .communityCategoryTab {
            min-height: 70px;
          }
        }
      `}</style>
    </section>
  );
}
