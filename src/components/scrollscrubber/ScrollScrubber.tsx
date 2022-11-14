/* eslint-disable react-hooks/exhaustive-deps */
import { Badge, Box, Group } from "@mantine/core";
import { useElementSize, useMediaQuery } from "@mantine/hooks";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import _ from "lodash";
import { DateTime } from "luxon";
import type { MouseEvent, ReactNode } from "react";
import { ScrollerType } from "./ScrollScrubberTypes.zod";
import type { IScrollerData, IScrollerPosition, IScrollerType } from "./ScrollScrubberTypes.zod";
import "./ScrollScrubber.css"
import i18n from "../../i18n";

type Props = {
  type: IScrollerType, // Type of scroller marks to display
  scrollPositions: IScrollerData[], // Array of positions to show on the scroller (label and Y position on target scrollable area)
  targetHeight: number, // Height of the target scrollable area 
  currentTargetY: number, // current scroll position off target scrollable area
  scrollToY: (number) => void, // Callback function that scrolls to a given Y position on target element
  children: ReactNode | null, // Target element must be one of the children nodes
};

export function ScrollScrubber({ type, scrollPositions, targetHeight, currentTargetY, scrollToY, children }: Props) {
  // ref and size of scrollscrubber
  const { ref, width, height } = useElementSize();
  const scrollerVisibilityTimerRef: {current: NodeJS.Timeout | null } = useRef(null);
  const matches = useMediaQuery("(min-width: 700px)");
  const [scrollerIsVisible, setScrollerIsVisible] = useState(false);
  const [positions, setPositions] = useState<IScrollerPosition[]>([]);
  const [markerPositions, setMarkerPositions] = useState<IScrollerPosition[]>([]);
  const [dragMarkerY, setDragMarkerY] = useState(0);
  const [dragMarkerIsVisible, setDragMarkerIsVisible] = useState(false);
  const [currentScrollPosMarkerY, setCurrentScrollPosMarkerY] = useState(0);
  const [currentLabel, setCurrentLabel] = useState("");
  const [cursor, setCursor] = useState("auto");
  const [targetClientHeight, setTargetClientHeight] = useState(0);
  const [offsetTop, setOffsetTop] = useState(0);
  const previousTargetY = useRef(NaN);

  const targetYToScrollerY = (y: number): number => {
    if (targetHeight > 0)
      return Math.min(y * height / (targetHeight - targetClientHeight), height);
    return NaN;
  };

  const scrollerYToTargetY = (y: number): number => {
    if (height > 0)
      return (y * (targetHeight - targetClientHeight) / height);
    return NaN;
  };

  const targetYToScrollerYPercentage = (y: number): number => {
    if (targetHeight > 0)
      return Math.min(y * 100 / (targetHeight - targetClientHeight), 100);
    return NaN;
  };

  const scrollerYToScrollerYPercentage = (y: number): number => {
    if (height > 0)
      return Math.min(y * 100 / height, 100);
    return NaN;
  };

  const getLabelForScrollerY = (y: number): string => {   
    for (let i = positions.length - 1; i >= 0; i -= 1) {
      if (y >= positions[i].scrollerY) {
        return positions[i].label;
      }
    }
    return '';
  };

  const getLabelsMarkers = useCallback((): IScrollerPosition[] => {
    const markers: IScrollerPosition[] = [];
    positions.forEach(item => {
      if (markers.length < 1 || item.scrollerY - markers.slice(-1)[0].scrollerY > 15) {
        markers.push({
          label: item.label,
          targetY: item.targetY,
          scrollerY: item.scrollerY,
          scrollerYPercent: item.scrollerYPercent
        });
      }
    });
    return markers;
  }, [positions]);

  const getLetterForAlphabetMarker = (str: string): string => {
    let firstChar = _.deburr(str.charAt(0)).toUpperCase();
    if (firstChar === firstChar.toLowerCase()) {
      // firstChar is not a letter
      if (/^\d$/.test(firstChar)) {
        // firstChar is a number
        firstChar = "#"
      } else {
        // firstChar is not alphanumeric
        firstChar = ":-)"
      }
    }
    return firstChar;
  };

  const getAlphabetMarkers = useCallback((): IScrollerPosition[] => {
    const alphabet: IScrollerPosition[] = [];
    let currentLetter: string | null = null;
    positions.forEach(item => {
      const letter = getLetterForAlphabetMarker(item.label);
      if ( letter !== currentLetter || item.label === "Unknown - Other") {
        currentLetter = letter;
        const label = item.label === "Unknown - Other" ? item.label : currentLetter;
        // Only display letter if there is enough space with preivous letter
        if (alphabet.length < 1 || item.scrollerY - alphabet.slice(-1)[0].scrollerY > 15) {
          alphabet.push({
            label: label,
            targetY: item.targetY,
            scrollerY: item.scrollerY,
            scrollerYPercent: item.scrollerYPercent
          });
        }
      }
   });
   return alphabet;
  }, [positions])

  const getLabelForDateMarker = (item: IScrollerPosition, type: string): string => {
    if (type === "years" && item.year)
      return item.year.toString();
    if (type === "months" && item.month)
      return item.month;
    return item.label;
  };

  const getDateMarkers = useCallback((type: string = "years"): IScrollerPosition[] => {
    const dates: IScrollerPosition[] = [];
    let countDifferentValues = 0;
    let currentDate: string = "";
    positions.forEach(item => {
      const label = getLabelForDateMarker(item, type);
      if ( label !== currentDate) {
        currentDate = label;
        countDifferentValues += 1;
        if (dates.length < 1 || item.scrollerY - dates.slice(-1)[0].scrollerY > 15) {
          dates.push({
            label: currentDate,
            targetY: item.targetY,
            scrollerY: item.scrollerY,
            scrollerYPercent: item.scrollerYPercent
          });
        }
      };
    });
    if (countDifferentValues < 10) {
      if (type === "years")
        return getDateMarkers("months");
      return getLabelsMarkers();
    }
    return dates;
  }, [positions]);

  useEffect(() => {
    let markersType = type;
    if (positions.length < 10)
      markersType = ScrollerType.enum.labels;

    if (markersType === ScrollerType.enum.alphabet)
      setMarkerPositions(getAlphabetMarkers());
    else if (markersType === ScrollerType.enum.date)
      setMarkerPositions(getDateMarkers());
    else
      setMarkerPositions(getLabelsMarkers());
  }, [positions]);

  useLayoutEffect(() => {
    const newPositions: IScrollerPosition[] = [];
    if (scrollPositions.length > 0) {
      scrollPositions.forEach(item => {
        const pos: IScrollerPosition = {
          label: item.label,
          targetY: item.targetY,
          scrollerY: targetYToScrollerY(item.targetY),
          scrollerYPercent: targetYToScrollerYPercentage(item.targetY)
        } 
        if (type === ScrollerType.enum.date) {
          pos.year = item.year;
          if (item.year && item.month) {
            pos.month = DateTime.fromISO(`${item.year}-${item.month.toString().padStart(2, '0')}-01`)
              .setLocale(i18n.resolvedLanguage.replace("_", "-"))
              .toLocaleString({ year: 'numeric', month: 'short' });
          }
        }
        newPositions.push(pos);
      });
      // Ensure positions are sorted by ascending targetY value
      newPositions.sort((a, b) => (a.targetY > b.targetY) ? 1 : -1);
    }
    setPositions(newPositions);   
  }, [scrollPositions, targetClientHeight]);

  const debouncedResize = useCallback(_.debounce(() => {
    setTargetClientHeight(window.innerHeight);
    if (ref.current) {
      let elmt = ref.current;
      while (typeof elmt.parentElement !== "undefined") {
        if (elmt.parentElement.offsetTop !== 0) {
          setOffsetTop(elmt.parentElement.offsetTop);
          break;
        }
        elmt = elmt.parentElement;
      }
    }
  }, 500), []);

  useEffect(() => {
    debouncedResize();
  }, [width, height]);

  const hideScrollScrubber = () => {
    if (scrollerVisibilityTimerRef.current) {
      clearTimeout(scrollerVisibilityTimerRef.current);
    }
    setScrollerIsVisible(false);
  };

  const startScrollerVisibilityTimer = () => {
    if (scrollerVisibilityTimerRef.current === null) {
      scrollerVisibilityTimerRef.current = setTimeout(hideScrollScrubber, 2500);
    }
  };

  const resetScrollerVisibilityTimer = useMemo(() => (
    _.throttle(() => {
      if (scrollerVisibilityTimerRef.current) {
        clearTimeout(scrollerVisibilityTimerRef.current);
        scrollerVisibilityTimerRef.current = setTimeout(hideScrollScrubber, 2500);
      }
    }, 1000)
  ), []);

  // eslint-disable-next-line arrow-body-style
  useEffect(() => {
    // Clear scrollerVisibilityTimerRef on dismount
    return () => {
      if (scrollerVisibilityTimerRef.current) {
        clearTimeout(scrollerVisibilityTimerRef.current); 
    }};
  }, []);

  const showScrollerScrubber = () => {
    if (!scrollerIsVisible) {
      setScrollerIsVisible(true);
      setCurrentScrollPosMarkerY(targetYToScrollerY(currentTargetY));
      startScrollerVisibilityTimer();
    } else {
      resetScrollerVisibilityTimer();
    }
  };

  const handleMouseEnter = () => {
    showScrollerScrubber();
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    resetScrollerVisibilityTimer();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = Math.max(Math.min(e.clientY - rect.top, rect.height), 0);
    const distanceFromRight = rect.right - e.clientX;
    if (distanceFromRight < 40) {
      setCursor("pointer");
      setDragMarkerIsVisible(true);
      setCurrentLabel(getLabelForScrollerY(mouseY));
    }
    else {
      setCursor("auto");
      setDragMarkerIsVisible(false);
      setCurrentLabel('');
    }
    // "+ 1" to match exactly currentScrollPosMarkerY on click
    setDragMarkerY(mouseY + 1);
  };

  const handleMouseClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = Math.max(Math.min(e.clientY - rect.top, rect.height), 0);
    const distanceFromRight = rect.right - e.clientX;
    if (distanceFromRight < 40) {
      setCurrentScrollPosMarkerY(mouseY);
      scrollToY(scrollerYToTargetY(mouseY));
    }
  };

  const DetectScrolling = (y: number, previousY: number) => {
    if (!Number.isNaN(previousY)) {
      const delta = Math.abs(previousY - y);
      if (delta > 400) {
        if (!scrollerIsVisible) {
          showScrollerScrubber();
        } else {
          resetScrollerVisibilityTimer();
        }
      }
    }
    previousTargetY.current = y;
  };

  const ThrottledDetectScrolling = useCallback(
    _.throttle(DetectScrolling, 1000),
    [scrollerIsVisible]
  );

  useEffect(() => {
    if (ThrottledDetectScrolling) {
      ThrottledDetectScrolling(currentTargetY, previousTargetY.current);
    }
  }, [currentTargetY]);

  const renderMarkers = useCallback(() => {
    if (!scrollerIsVisible || markerPositions.length === 0)
      return null;
    
    const halfMarkerHeightInPercent =  scrollerYToScrollerYPercentage(6);
    return markerPositions.map<ReactNode>(
        item =>
          <Badge
            key={item.label}
            className="scrollscrubber-marker"
            size="sm"
            style= {{
              top: `${item.scrollerYPercent - halfMarkerHeightInPercent}%`,
              cursor: "pointer"
            }}
            sx={theme => ({
              backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[1],
              color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.colors.gray[7],
              borderColor: theme.colorScheme === "dark" ? theme.colors.dark[3] : theme.colors.gray[3]
            })}
            onClick={() => {
              setCurrentScrollPosMarkerY(item.scrollerY);
              scrollToY(item.targetY)
            }}
          >
            {item.label}
          </Badge>
      ).reduce((prev: ReactNode, curr: ReactNode) => [prev, ' ', curr]);
  }, [markerPositions, scrollerIsVisible]);

  const renderMarkersLines = useCallback(() => {
    if (!scrollerIsVisible || markerPositions.length === 0)
      return null;

    return markerPositions.map<ReactNode>(
        item =>
          <Box
            key={`line-${item.label}`}
            className="scrollscrubber-marker-line"
            sx={theme => ({
              backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[2] : theme.colors.gray[6]
            })}
            style= {{ top: `${item.scrollerYPercent}%` }}
          />
      ).reduce((prev: ReactNode, curr: ReactNode) => [prev, ' ', curr]);
  }, [markerPositions, scrollerIsVisible]);

  const renderDragMarker = () => {
    if (!dragMarkerIsVisible)
      return  null;
    return (
      <Group style={{
        position: "absolute",
        right: 0,
        top: dragMarkerY }}
      >
        {currentLabel !== '' && ( 
          <Badge
            size="lg"
            style={{
              position: "absolute",
              right: "25px" }}
            sx={theme => ({
              backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[1],
              color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.colors.gray[7],
              borderColor: theme.colorScheme === "dark" ? theme.colors.dark[3] : theme.colors.gray[3]
            })}
          >
            {currentLabel}
          </Badge>
        )}
        <Box
          className="scrollscrubber-drag-position"
          sx={theme => ({
            backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
            boxShadow: `0 0 0 4px ${theme.colorScheme === "dark"
            ? theme.colors.gray[0]
            : theme.colors.dark[6]}`
          })}
        />
      </Group>
    )
  };

  const renderCurrentScrollPosMarker = () => (
    <Box
      className="scrollscrubber-current-position"
      sx={theme => ({
        backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
        boxShadow: `0 0 0 4px ${theme.colors.green[6]}`
      })}
      style={{
        top: currentScrollPosMarkerY
      }}
    />
  );

  if (scrollPositions.length === 0 || targetClientHeight === 0)
    return (<div>{children}</div>);

  return (
    <div>
      {children}
      <Box
        ref={ref}
        className="scrollscrubber"
        style={{
          opacity: scrollerIsVisible ? 1 : 0,
          cursor: cursor,
          top: `${offsetTop}px`,
          bottom: matches ? "0": "50px",
        }}
        sx={theme => ({
          backgroundImage: `linear-gradient(${
              theme.colorScheme === "dark"
              ? theme.colors.dark[2]
              : theme.colors.gray[6]
            }, ${
              theme.colorScheme === "dark"
              ? theme.colors.dark[2]
              : theme.colors.gray[6]
            })`
        })}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onClick={handleMouseClick}
      >  
        {renderMarkers()}
        {renderMarkersLines()}
        {renderDragMarker()}
        {renderCurrentScrollPosMarker()}
      </Box>
    </div>
  );
}