import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'media';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Missing Supabase vars' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch all uploads
    const uploads = await prisma.upload.findMany();
    let renamedCount = 0;
    const renameMap = {};

    for (const upload of uploads) {
      const oldName = upload.filename;
      // If filename has spaces or weird chars, fix it
      if (oldName.match(/[^a-zA-Z0-9_.-]/)) {
        const newName = oldName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9_.-]/g, '_');
        
        if (oldName !== newName) {
          console.log(`Renaming ${oldName} to ${newName}`);
          
          // Move in Supabase
          const { data, error } = await supabase.storage.from(bucket).move(oldName, newName);
          if (error && error.statusCode !== '404') {
            console.error(`Error moving file ${oldName} in Supabase:`, error);
          }

          // Update Upload table
          await prisma.upload.update({
            where: { id: upload.id },
            data: { filename: newName }
          });

          renameMap[oldName] = newName;
          renamedCount++;
        }
      }
    }

    // 2. Update Flows
    const flows = await prisma.flow.findMany();
    let updatedFlows = 0;

    for (const flow of flows) {
      if (!flow.steps) continue;
      let stepsJson = flow.steps;
      let changed = false;

      for (const [oldName, newName] of Object.entries(renameMap)) {
        const encodedOld = encodeURIComponent(oldName).replace(/%2F/g, '/');
        // Flows store URLs like /api/uploads/filename
        if (stepsJson.includes(oldName) || stepsJson.includes(encodedOld)) {
          stepsJson = stepsJson.split(oldName).join(newName);
          stepsJson = stepsJson.split(encodedOld).join(newName);
          changed = true;
        }
      }

      if (changed) {
        await prisma.flow.update({
          where: { id: flow.id },
          data: { steps: stepsJson }
        });
        updatedFlows++;
      }
    }

    return NextResponse.json({ success: true, renamedCount, updatedFlows, renameMap });
  } catch (error) {
    console.error('Error in fix-media:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
