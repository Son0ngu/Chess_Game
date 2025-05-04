import React from 'react';
import DOMPurify from 'dompurify';

function inputSanitize({ userComment }) {
  const clean = DOMPurify.sanitize(userComment);

  return (
    <div dangerouslySetInnerHTML={{ __html: clean }} />
  );
}

export default inputSanitize;
