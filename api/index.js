import play from './play.js';
import openTasks from './openTasks.js';
import openAddTask from './openAddTask.js';
import openSwap from './openSwap.js';
import swap from './swap.js';
import joinChannel from './joinChannel.js';
import watchAd from './watchAd.js';
import joinCommunityTask from './joinCommunityTask.js';
import collect from './collect.js';
import back from './back.js';

export default function (req, res) {
  const { url } = req;
  if (url === '/api/play') return play(req, res);
  if (url === '/api/openTasks') return openTasks(req, res);
  if (url === '/api/openAddTask') return openAddTask(req, res);
  if (url === '/api/openSwap') return openSwap(req, res);
  if (url === '/api/swap') return swap(req, res);
  if (url === '/api/joinChannel') return joinChannel(req, res);
  if (url === '/api/watchAd') return watchAd(req, res);
  if (url === '/api/joinCommunityTask') return joinCommunityTask(req, res);
  if (url === '/api/collect') return collect(req, res);
  if (url === '/api/back') return back(req, res);
  res.status(404).json({ ok: false });
}
