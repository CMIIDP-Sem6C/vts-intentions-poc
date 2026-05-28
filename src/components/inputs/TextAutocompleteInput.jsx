import React, { useState, useRef, useEffect, useCallback } from "react";

const TextAutocompleteInput = ({
  value = "",
  onSubmit,
  suggestions = [],
  placeholder = "Onbekend - voer in...",
  className = "",
  style = "",
  level,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  // Filter suggestions based on input
  useEffect(() => {
    if (!inputValue) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = suggestions
      .map((item) => item.name)
      .filter((name) => name.toLowerCase().includes(inputValue.toLowerCase()));

    setFilteredSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setActiveSuggestionIndex(-1);
  }, [inputValue, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  }, [inputValue, onSubmit]);

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestionIndex >= 0) {
        setInputValue(filteredSuggestions[activeSuggestionIndex]);
        setTimeout(() => {
          handleSubmit();
          setShowSuggestions(false);
        }, 0);
      } else {
        handleSubmit();
        inputRef.current?.blur();
      }
    } else if (e.key === "Tab" && filteredSuggestions.length > 0) {
      e.preventDefault();
      setInputValue(filteredSuggestions[0]);
      setShowSuggestions(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    // Delay submission to allow state update
    setTimeout(() => {
      onSubmit(suggestion);
    }, 0);
  };

  const handleBlur = () => {
    // Don't submit on blur — only on explicit submit
    // Suggestions are handled via click
  };

  return (
    <div className={`autocomplete-container ${className}`} ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        className={`dest-input`}
        style={style}
        value={inputValue}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck="false"
      />
      {showSuggestions && (
        <ul className="suggestions-dropdown">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              className={`suggestion-item ${
                index === activeSuggestionIndex ? "active" : ""
              }`}
              onMouseDown={() => handleSuggestionClick(suggestion)} // Critical: use mouseDown, not click
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default React.memo(TextAutocompleteInput);
