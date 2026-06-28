def get_depth_profile(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    depth = 0
    profile = []
    
    in_multiline_comment = False
    
    for idx, line in enumerate(lines):
        # We need to trace curly braces, keeping track of comments
        in_comment = False
        in_string = False
        string_char = None
        
        i = 0
        while i < len(line):
            c = line[i]
            
            if in_comment:
                break
                
            if in_multiline_comment:
                if i < len(line) - 1 and line[i:i+2] == '*/':
                    in_multiline_comment = False
                    i += 2
                    continue
                i += 1
                continue
                
            if in_string:
                if c == '\\':
                    i += 2
                    continue
                if c == string_char:
                    in_string = False
                i += 1
                continue
                
            if i < len(line) - 1 and line[line[i:].startswith('//')]:
                break
            if i < len(line) - 1 and line[i:i+2] == '/*':
                in_multiline_comment = True
                i += 2
                continue
                
            if c in ['"', "'", '`']:
                in_string = True
                string_char = c
                i += 1
                continue
                
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
            i += 1
        
        profile.append((line.strip(), depth))
    return profile

clean = get_depth_profile('scratch/App_clean.tsx')
modified = get_depth_profile('src/App.tsx')

# Find the first mismatch in content or relative depth
c_idx = 0
m_idx = 0

print("Comparing clean vs modified...")
while c_idx < len(clean) and m_idx < len(modified):
    c_line, c_depth = clean[c_idx]
    m_line, m_depth = modified[m_idx]
    
    if c_line != m_line:
        # Since lines differ (due to additions/deletions), we align them
        # Let's find where they align again
        # But wait! We can just print the mismatch and their depths
        print(f"Mismatch starting at clean line {c_idx+1} vs modified line {m_idx+1}")
        print(f"Clean: depth {c_depth} | {c_line[:60]}")
        print(f"Mod  : depth {m_depth} | {m_line[:60]}")
        
        # Let's search forward for matching lines to re-align
        found = False
        for next_m in range(m_idx + 1, min(m_idx + 100, len(modified))):
            if modified[next_m][0] == c_line:
                # Re-aligned! The diff was additions in modified.
                # Let's print the added block's net depth change
                added_depth_change = modified[next_m - 1][1] - m_depth
                print(f"-> Added block ends at mod line {next_m}. Net depth change: {added_depth_change}")
                m_idx = next_m
                found = True
                break
        
        if not found:
            # Maybe clean has deletions
            for next_c in range(c_idx + 1, min(c_idx + 100, len(clean))):
                if clean[next_c][0] == m_line:
                    print(f"-> Deleted block in clean ends at line {next_c}")
                    c_idx = next_c
                    found = True
                    break
                    
        if not found:
            # Just advance both
            c_idx += 1
            m_idx += 1
            continue
            
    c_idx += 1
    m_idx += 1

print("Done.")
