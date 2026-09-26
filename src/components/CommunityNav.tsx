'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type CommunityCategory =
  | 'learning'
  | 'stocks-to-watch-next-week';

export default function CommunityNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
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

  function handleCategoryClick(
    category: CommunityCategory
  ) {
    setOpen(false);

    const hash =
      category === 'learning'
        ? '#learning'
        : '#stocks-to-watch-next-week';

    // Already on Community:
    // change only the hash, so there is NO route loading.
    if (pathname === '/community') {
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      }

      return;
    }

    // Coming from Home / Long Videos / Shorts:
    // navigate normally to Community + selected section.
    router.push(`/community${hash}`);
  }

  return (
    <div
      ref={wrapperRef}
      className="communityNavWrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="communityNavTrigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() =>
          setOpen(current => !current)
        }
      >
        <span>Community</span>

        <span
          className={`communityNavArrow ${
            open ? 'open' : ''
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <div
        className={`communityNavMenu ${
          open ? 'visible' : ''
        }`}
        role="menu"
      >
        <button
          type="button"
          className="communityNavItem"
          role="menuitem"
          onClick={() =>
            handleCategoryClick('learning')
          }
        >
          <span className="communityNavIcon">
            📘
          </span>

          <span className="communityNavText">
            <strong>Learning</strong>
            <small>
              Educational posts & chart lessons
            </small>
          </span>
        </button>

        <button
          type="button"
          className="communityNavItem"
          role="menuitem"
          onClick={() =>
            handleCategoryClick(
              'stocks-to-watch-next-week'
            )
          }
        >
          <span className="communityNavIcon">
            📈
          </span>

          <span className="communityNavText">
            <strong>
              Stocks to watch next week
            </strong>

            <small>
              Weekly watchlist & setups
            </small>
          </span>
        </button>
      </div>

      <style>{`
        .communityNavWrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          height: 100%;
        }

        .communityNavTrigger {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0;
          margin: 0;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          font-size: inherit;
          line-height: inherit;
          cursor: pointer;
          white-space: nowrap;
        }

        .communityNavArrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          line-height: 1;
          transform: translateY(1px);
          transition: transform 0.16s ease;
        }

        .communityNavArrow.open {
          transform:
            translateY(1px)
            rotate(180deg);
        }

        .communityNavMenu {
          position: absolute;
          top: 100%;
          right: 0;
          z-index: 99999;
          width: 330px;
          padding: 8px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 14px;
          background: #ffffff;
          box-shadow:
            0 16px 40px
            rgba(15, 23, 42, 0.16);

          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateY(-4px);

          transition:
            opacity 0.14s ease,
            visibility 0.14s ease,
            transform 0.14s ease;
        }

        .communityNavMenu.visible {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateY(0);
        }

        .communityNavItem {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          width: 100%;
          box-sizing: border-box;
          padding: 11px 12px;
          margin: 0;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .communityNavItem:hover,
        .communityNavItem:focus-visible {
          background:
            rgba(15, 23, 42, 0.055);
          outline: none;
        }

        .communityNavIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background:
            rgba(15, 23, 42, 0.07);
          font-size: 17px;
        }

        .communityNavText {
          min-width: 0;
        }

        .communityNavText strong,
        .communityNavText small {
          display: block;
        }

        .communityNavText strong {
          margin-bottom: 2px;
          font-size: 14px;
          line-height: 1.3;
        }

        .communityNavText small {
          font-size: 12px;
          line-height: 1.4;
          opacity: 0.68;
        }

        @media (max-width: 700px) {
          .communityNavMenu {
            left: 50%;
            right: auto;
            width:
              min(
                320px,
                calc(100vw - 28px)
              );

            transform:
              translate(-50%, -4px);
          }

          .communityNavMenu.visible {
            transform:
              translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}
