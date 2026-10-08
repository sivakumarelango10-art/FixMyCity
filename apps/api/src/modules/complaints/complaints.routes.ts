import { Router, type Request, type Response } from 'express';
import {
  addNoteSchema,
  complaintListQuerySchema,
  createComplaintBodySchema,
  feedbackSchema,
  nearbyQuerySchema,
  reopenSchema,
  updateStatusSchema,
  uuidSchema,
} from '@fixmycity/shared';
import { clientIp, ok, paginated, param, parse } from '../../lib/http.js';
import { currentUser, requireAuth, requireCitizen, requireStaff } from '../../middleware/auth.js';
import { complaintLimiter } from '../../middleware/rate-limit.js';
import * as complaints from './complaints.service.js';
import * as workflow from './workflow.service.js';
import { photoUpload } from './media.service.js';

export const complaintsRouter = Router();
complaintsRouter.use(requireAuth);

const idParam = (req: Request) => parse(uuidSchema, param(req, 'id'));

/** Submit a complaint (multipart: fields + up to 3 "photos"). */
complaintsRouter.post('/', requireCitizen, complaintLimiter, photoUpload, async (req: Request, res: Response) => {
  const body = parse(createComplaintBodySchema, req.body);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const created = await complaints.createComplaint(currentUser(req), body, files, clientIp(req));
  ok(res, created, 201);
});

/** Complaints visible to the caller: own (citizen), department (officer) or all (admin). */
complaintsRouter.get('/', async (req, res) => {
  const query = parse(complaintListQuerySchema, req.query);
  const { data, meta } = await complaints.listComplaints(currentUser(req), query);
  paginated(res, data, meta);
});

/** Possible duplicates near a location (public-safe fields only). */
complaintsRouter.get('/nearby', async (req, res) => {
  const query = parse(nearbyQuerySchema, req.query);
  ok(res, await complaints.nearbyComplaints(query, currentUser(req).id));
});

complaintsRouter.get('/:id', async (req, res) => {
  ok(res, await complaints.getComplaintDetail(currentUser(req), idParam(req)));
});

complaintsRouter.get('/:id/history', async (req, res) => {
  ok(res, await complaints.getTimeline(currentUser(req), idParam(req)));
});

complaintsRouter.get('/:id/attachments/:attachmentId', async (req, res) => {
  const attachmentId = parse(uuidSchema, param(req, 'attachmentId'));
  const size = req.query.size === 'thumb' ? 'thumb' : undefined;
  const file = await complaints.getAttachmentFile(currentUser(req), idParam(req), attachmentId, size);
  res.set('Cache-Control', 'private, max-age=3600');
  res.type(file.mimeType).send(file.buffer);
});

complaintsRouter.patch('/:id/status', requireStaff, async (req, res) => {
  const input = parse(updateStatusSchema, req.body);
  const { complaint } = await workflow.updateStatus(currentUser(req), idParam(req), input, clientIp(req));
  ok(res, { id: complaint.id, status: complaint.currentStatus });
});

complaintsRouter.post('/:id/notes', requireStaff, async (req, res) => {
  const input = parse(addNoteSchema, req.body);
  const note = await workflow.addNote(currentUser(req), idParam(req), input, clientIp(req));
  ok(res, { id: note.id }, 201);
});

complaintsRouter.post('/:id/resolution-photos', requireStaff, photoUpload, async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const count = await workflow.addResolutionPhotos(currentUser(req), idParam(req), files, clientIp(req));
  ok(res, { added: count }, 201);
});

complaintsRouter.post('/:id/reopen', requireCitizen, async (req, res) => {
  const { reason } = parse(reopenSchema, req.body);
  const complaint = await workflow.reopenComplaint(currentUser(req), idParam(req), reason, clientIp(req));
  ok(res, { id: complaint.id, status: complaint.currentStatus });
});

complaintsRouter.post('/:id/feedback', requireCitizen, async (req, res) => {
  const input = parse(feedbackSchema, req.body);
  const feedback = await workflow.submitFeedback(currentUser(req), idParam(req), input, clientIp(req));
  ok(res, { id: feedback.id, rating: feedback.rating }, 201);
});
