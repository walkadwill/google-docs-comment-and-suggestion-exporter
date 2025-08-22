function exportAllEditsToSheet() {

  // ⛔️ IMPORTANT: Insert your Google Doc ID here.
  const docId = 'YOUR_DOCUMENT_ID_HERE';
  
  const doc = DocumentApp.openById(docId);
  const docTitle = doc.getName();
  
  const spreadsheetName = `All Comments & Suggestions from "${docTitle}"`;
  const ss = SpreadsheetApp.create(spreadsheetName);
  const sheet = ss.getActiveSheet();
  
  sheet.appendRow(['Change Type', 'Author', 'Content', 'Timestamp', 'Link to Change']);

  let allChanges = [];

  // 1. Get all standard comments using the Drive API (v2)
  let pageToken;
  let pageCount = 0;
  const maxPages = 20;
  do {
    const commentsResponse = Drive.Comments.list(docId, {
      includeResolved: true,
      maxResults: 100, 
      pageToken: pageToken
    });
    
    if (commentsResponse.items && commentsResponse.items.length > 0) {
      commentsResponse.items.forEach(function(comment) {
        allChanges.push({
          type: 'Comment',
          author: (comment.author && comment.author.displayName) ? comment.author.displayName : 'N/A',
          content: comment.content,
          timestamp: new Date(comment.createdDate),
          link: `https://docs.google.com/document/d/${docId}/edit?disco=${comment.commentId}`
        });
      });
    }
    pageToken = commentsResponse.nextPageToken;
    pageCount++;
    if (pageCount >= maxPages) {
        break;
    }
  } while (pageToken);

  // 2. Get all suggestions and revisions using the Docs API (v1)
  const docsResponse = Docs.Documents.get(docId);
  if (docsResponse.body && docsResponse.body.content) {
    docsResponse.body.content.forEach(function(element) {
      if (element.paragraph) {
        element.paragraph.elements.forEach(function(subElement) {
          if (subElement.textRun) {
            if (subElement.textRun.suggestedInsertionIds && subElement.textRun.suggestedInsertionIds.length > 0) {
              const author = subElement.textRun.suggestedInsertionIds.join(', ');
              const content = subElement.textRun.content.trim();
              const timestamp = new Date();
              allChanges.push({ type: 'Insertion', author: author, content: content, timestamp: timestamp, link: 'N/A' });
            }
            if (subElement.textRun.suggestedDeletionIds && subElement.textRun.suggestedDeletionIds.length > 0) {
              const author = subElement.textRun.suggestedDeletionIds.join(', ');
              const content = subElement.textRun.content.trim();
              const timestamp = new Date();
              allChanges.push({ type: 'Deletion', author: author, content: content, timestamp: timestamp, link: 'N/A' });
            }
          }
        });
      }
    });
  }

  // 3. Sort the combined list by timestamp (oldest to newest)
  allChanges.sort((a, b) => a.timestamp - b.timestamp);

  // 4. Write all changes to the spreadsheet
  allChanges.forEach(function(change) {
    sheet.appendRow([change.type, change.author, change.content, change.timestamp.toISOString(), change.link]);
  });

  Logger.log(`All changes exported to spreadsheet: ${ss.getUrl()}`);
}
