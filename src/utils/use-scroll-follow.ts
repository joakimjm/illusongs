import type { RefCallback } from "react";
import { useCallback, useEffect, useRef } from "react";

const DEFAULT_STRENGTH = 0.06;
const DEFAULT_MAX_OFFSET = 12;
const CSS_PROPERTY = "--scroll-follow-offset";

type Subscriber = {
  element: HTMLElement;
  strength: number;
  maxOffset: number;
};

type ScrollFollowOptions = {
  readonly strength?: number;
  readonly maxOffset?: number;
};

const subscribers = new Set<Subscriber>();
let frameId: number | null = null;
let isListening = false;
let motionQuery: MediaQueryList | null = null;

const isBrowser = (): boolean => typeof window !== "undefined";

const prefersReducedMotion = (): boolean =>
  isBrowser() &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (value: number, limit: number): number =>
  Math.max(Math.min(value, limit), -limit);

const getScrollPosition = (): number => {
  if (!isBrowser()) {
    return 0;
  }

  return window.scrollY || window.pageYOffset || 0;
};

const updateSubscribers = () => {
  frameId = null;

  if (!isBrowser()) {
    return;
  }

  const scrollPosition = getScrollPosition();

  subscribers.forEach((subscriber) => {
    const offset = clamp(
      scrollPosition * subscriber.strength,
      subscriber.maxOffset,
    );

    subscriber.element.style.setProperty(
      CSS_PROPERTY,
      `${offset.toFixed(2)}px`,
    );
  });
};

const scheduleUpdate = () => {
  if (frameId !== null || !isBrowser()) {
    return;
  }

  frameId = window.requestAnimationFrame(updateSubscribers);
};

const handleScroll = () => {
  scheduleUpdate();
};

const addListeners = () => {
  if (!isBrowser() || isListening) {
    return;
  }

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll, { passive: true });

  if (typeof window.matchMedia === "function") {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", handleMotionPreferenceChange);
    } else if (typeof motionQuery.addListener === "function") {
      motionQuery.addListener(handleMotionPreferenceChange);
    }
  }

  isListening = true;
};

const removeListeners = () => {
  if (!isBrowser() || !isListening) {
    return;
  }

  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", handleScroll);

  if (motionQuery) {
    if (typeof motionQuery.removeEventListener === "function") {
      motionQuery.removeEventListener("change", handleMotionPreferenceChange);
    } else if (typeof motionQuery.removeListener === "function") {
      motionQuery.removeListener(handleMotionPreferenceChange);
    }
    motionQuery = null;
  }

  if (frameId !== null) {
    window.cancelAnimationFrame(frameId);
    frameId = null;
  }

  isListening = false;
};

const handleMotionPreferenceChange = () => {
  if (prefersReducedMotion()) {
    subscribers.forEach((subscriber) => {
      subscriber.element.style.setProperty(CSS_PROPERTY, "0px");
    });
    removeListeners();
    return;
  }

  addListeners();
  scheduleUpdate();
};

const registerSubscriber = (subscriber: Subscriber) => {
  if (prefersReducedMotion()) {
    subscriber.element.style.setProperty(CSS_PROPERTY, "0px");
    return;
  }

  subscribers.add(subscriber);
  addListeners();
  scheduleUpdate();
};

const unregisterSubscriber = (subscriber: Subscriber) => {
  subscribers.delete(subscriber);
  subscriber.element.style.removeProperty(CSS_PROPERTY);

  if (subscribers.size === 0) {
    removeListeners();
  }
};

export const useScrollFollow = <ElementType extends HTMLElement>(
  options: ScrollFollowOptions = {},
): RefCallback<ElementType> => {
  const { strength = DEFAULT_STRENGTH, maxOffset = DEFAULT_MAX_OFFSET } =
    options;

  const subscriberRef = useRef<Subscriber | null>(null);

  useEffect(() => {
    return () => {
      const subscriber = subscriberRef.current;
      if (!subscriber) {
        return;
      }
      unregisterSubscriber(subscriber);
      subscriberRef.current = null;
    };
  }, []);

  return useCallback(
    (node: ElementType | null) => {
      const previousSubscriber = subscriberRef.current;
      if (previousSubscriber) {
        unregisterSubscriber(previousSubscriber);
        subscriberRef.current = null;
      }

      if (!node || !isBrowser()) {
        return;
      }

      const subscriber: Subscriber = {
        element: node,
        strength,
        maxOffset,
      };

      subscriberRef.current = subscriber;
      registerSubscriber(subscriber);
    },
    [maxOffset, strength],
  );
};
