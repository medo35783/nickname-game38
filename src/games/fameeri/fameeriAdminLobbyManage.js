import { ref as dbRef, update } from 'firebase/database';
import { db } from '../../firebase';
import { leaderByUidPath } from './fameeriLeaderIndex';

function resetGroupDistribution(updates, qRoom, groupId) {
  updates[`qrooms/${qRoom}/groups/${groupId}/distributed`] = false;
  updates[`qrooms/${qRoom}/groups/${groupId}/trees`] = {};
  updates[`qrooms/${qRoom}/groups/${groupId}/treesInitial`] = null;
}

function clearGroupLeader(updates, qRoom, groupId, leader) {
  updates[`qrooms/${qRoom}/groups/${groupId}/leaderMemberId`] = null;
  updates[`qrooms/${qRoom}/groups/${groupId}/leaderUid`] = null;
  if (leader?.ownerUid) updates[leaderByUidPath(qRoom, leader.ownerUid)] = null;
}

export async function renameFameeriGroup(qRoom, groupId, name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  await update(dbRef(db, `qrooms/${qRoom}/groups/${groupId}`), { name: trimmed });
  return true;
}

export async function deleteFameeriGroup(qRoom, groupId, members) {
  const updates = {};
  members
    .filter((m) => m.groupId === groupId)
    .forEach((m) => {
      updates[`qrooms/${qRoom}/members/${m.id}/groupId`] = null;
      if (m.role === 'leader') {
        updates[`qrooms/${qRoom}/members/${m.id}/role`] = 'member';
        if (m.ownerUid) updates[leaderByUidPath(qRoom, m.ownerUid)] = null;
      }
    });
  updates[`qrooms/${qRoom}/groups/${groupId}`] = null;
  await update(dbRef(db), updates);
}

export async function removeFameeriMemberFromGroup(qRoom, groupId, member, group) {
  const updates = {};
  updates[`qrooms/${qRoom}/members/${member.id}/groupId`] = null;
  if (member.role === 'leader') {
    updates[`qrooms/${qRoom}/members/${member.id}/role`] = 'member';
    clearGroupLeader(updates, qRoom, groupId, member);
    if (group?.distributed) resetGroupDistribution(updates, qRoom, groupId);
  }
  await update(dbRef(db), updates);
}

export async function moveFameeriMemberToGroup(qRoom, fromGroupId, toGroupId, member, fromGroup) {
  if (fromGroupId === toGroupId) return;
  const updates = {};
  updates[`qrooms/${qRoom}/members/${member.id}/groupId`] = toGroupId;
  if (member.role === 'leader') {
    updates[`qrooms/${qRoom}/members/${member.id}/role`] = 'member';
    clearGroupLeader(updates, qRoom, fromGroupId, member);
    if (fromGroup?.distributed) resetGroupDistribution(updates, qRoom, fromGroupId);
  }
  await update(dbRef(db), updates);
}

export async function demoteFameeriLeader(qRoom, groupId, leader, group) {
  const updates = {};
  updates[`qrooms/${qRoom}/members/${leader.id}/role`] = 'member';
  clearGroupLeader(updates, qRoom, groupId, leader);
  if (group?.distributed) resetGroupDistribution(updates, qRoom, groupId);
  await update(dbRef(db), updates);
}
