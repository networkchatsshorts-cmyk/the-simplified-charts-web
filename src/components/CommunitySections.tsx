'use client';

import { useEffect, useRef, useState } from 'react';
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

export default function CommunitySections({
  posts,
}: {
  posts: Post[];
}) {
  const [activeCategory, setActiveCategory] =
    useState<Category>('learning');

  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  function selectCategory(category: Category) {
    setActiveCategory(category);
    setMenuOpen(false);
  }

  function toggleMenu() {
    setMenuOpen(prev => !prev);
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    document.addEventListener(
      'keydown',
      handleEscape
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );

      document.removeEventListener(
        'keydown',
        handleEscape
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
      {/* =====================================================
          COMMUNITY HEADING
          Desktop: hover opens menu via CSS
          Mobile: tap opens menu via React state
          ===================================================== */}
      <div
        ref={menuRef}
        className={`communityTitleArea ${
          menuOpen ? 'menuOpen' : ''
        }`}
      >
        <button
          type="button"
          className="communityTitleButton"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={toggleMenu}
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

        {/* =================================================
            TOP CATEGORY MENU
            ================================================= */}
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

            <span className="communityOptionText">
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

            <span className="communityOptionText">
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

      <p className="lead">
        Market observations, charts, updates and
        discussions from the channel. Open a post to
        read and join the conversation.
      </p>

      {/* =====================================================
          VISIBLE SECTION SELECTOR
          ===================================================== */}
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
      </div>

      {/* =====================================================
          LEARNING SECTION

          IMPORTANT:
          This remains in the HTML even when not selected.
          Only the visual display is switched.
          ===================================================== */}
      <section
        className={`communityActiveSection ${
          activeCategory === 'learning'
            ? 'sectionVisible'
            : 'sectionHidden'
        }`}
        aria-hidden={activeCategory !== 'learning'}
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
                <h3>No Learning posts yet</h3>

                <p className="small">
                  New posts will appear here.
                </p>
              </div>
            </div>
          )}
        </SearchAndPaginate>
      </section>

      {/* =====================================================
          STOCKS TO WATCH NEXT WEEK SECTION

          Also remains in the HTML.
          ===================================================== */}
      <section
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
           COMMUNITY HEADING
           ========================================= */

        .communityTitleArea {
          position: relative;
          display: inline-block;
          z-index: 99999;
          overflow: visible;
        }

        .communityTitleButton {
          display: inline-flex;
          align-items: center;
          gap: 9px;

          padding: 0;
          border: 0;

          background: transparent;
          color: inherit;

          font: inherit;
          font-size: clamp(2rem, 5vw, 4rem);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.04em;

          cursor: pointer;
        }

        .communityTitleArrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          width: 28px;
          height: 28px;

          border-radius: 50%;

          font-size: 18px;

          transition:
            transform 0.18s ease,
            background 0.18s ease;
        }

        .communityTitleButton:hover
          .communityTitleArrow {
          background: rgba(15, 23, 42, 0.08);
        }

        .communityTitleArrow.open {
          transform: rotate(180deg);
        }

        /* =========================================
           TOP MENU
           ========================================= */

        .communityTopMenu {
          position: absolute;

          top: calc(100% + 4px);
          left: 0;

          z-index: 100000;

          width: min(
            410px,
            calc(100vw - 28px)
          );

          padding: 10px;

          border: 1px solid
            rgba(15, 23, 42, 0.14);

          border-radius: 16px;

          background: #fff;

          box-shadow:
            0 18px 50px
              rgba(15, 23, 42, 0.18);

          opacity: 0;
          visibility: hidden;
          pointer-events: none;

          transform: translateY(4px);

          transition:
            opacity 0.16s ease,
            visibility 0.16s ease,
            transform 0.16s ease;
        }

        /*
          Desktop hover.
          No JS mouse enter/leave required.
        */
        @media (hover: hover) and (pointer: fine) {
          .communityTitleArea:hover
            .communityTopMenu {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            transform: translateY(0);
          }
        }

        /*
          Mobile/click state.
        */
        .communityTitleArea.menuOpen
          .communityTopMenu {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateY(0);
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
          background:
            rgba(15, 23, 42, 0.05);

          border-color:
            rgba(15, 23, 42, 0.12);
        }

        .communityOptionIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          flex: 0 0 auto;

          width: 36px;
          height: 36px;

          border-radius: 10px;

          background:
            rgba(15, 23, 42, 0.07);

          font-size: 18px;
        }

        .communityOptionText {
          min-width: 0;
        }

        .communityTopOption strong,
        .communityTopOption small {
          display: block;
        }

        .communityTopOption strong {
          margin-bottom: 3px;
          font-size: 15px;
          line-height: 1.3;
        }

        .communityTopOption small {
          font-size: 13px;
          line-height: 1.4;
          opacity: 0.72;
        }

        /* =========================================
           MAIN SELECTOR
           ========================================= */

        .communityCategoryArea {
          margin-top: 26px;
          padding: 20px;

          border: 1px solid
            rgba(15, 23, 42, 0.12);

          border-radius: 18px;

          background:
            rgba(255, 255, 255, 0.8);
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
          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 12px;
        }

        .communityCategoryTab {
          position: relative;

          display: flex;
          align-items: center;
          gap: 13px;

          min-height: 78px;
          padding: 15px 48px 15px 17px;

          border: 1px solid
            rgba(15, 23, 42, 0.12);

          border-radius: 14px;

          background: #fff;
          color: inherit;

          text-align: left;

          cursor: pointer;

          transition:
            transform 0.16s ease,
            border-color 0.16s ease,
            box-shadow 0.16s ease,
            background 0.16s ease;
        }

        .communityCategoryTab:hover {
          transform: translateY(-1px);

          box-shadow:
            0 8px 24px
              rgba(15, 23, 42, 0.08);
        }

        /*
          Strong selected state.
        */
        .communityCategoryTab.active {
          border-color:
            rgba(15, 23, 42, 0.55);

          background:
            rgba(15, 23, 42, 0.045);

          box-shadow:
            0 8px 26px
              rgba(15, 23, 42, 0.12);

          transform: translateY(-1px);
        }

        .tabIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          flex: 0 0 auto;

          width: 40px;
          height: 40px;

          border-radius: 11px;

          background:
            rgba(15, 23, 42, 0.07);

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
          line-height: 1.3;
        }

        .tabText small {
          font-size: 13px;
          line-height: 1.4;
          opacity: 0.68;
        }

        .selectedBadge {
          position: absolute;

          top: 50%;
          right: 16px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          width: 28px;
          height: 28px;

          border-radius: 50%;

          background: rgba(15, 23, 42, 0.92);
          color: #fff;

          font-size: 15px;
          font-weight: 800;

          transform: translateY(-50%);
        }

        /* =========================================
           ACTIVE CONTENT
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
          .communityTopMenu {
            width: min(
              360px,
              calc(100vw - 28px)
            );
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
            min-height: 72px;
          }
        }
      `}</style>
    </section>
  );
}
