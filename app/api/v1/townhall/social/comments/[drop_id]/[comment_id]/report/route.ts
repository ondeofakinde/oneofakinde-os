import { getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";

type CommentReportRouteParams = {
  drop_id: string;
  comment_id: string;
};

export async function POST(
  request: Request,
  context: RouteContext<CommentReportRouteParams>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const dropId = await getRequiredRouteParam(context, "drop_id");
  const commentId = await getRequiredRouteParam(context, "comment_id");
  if (!dropId || !commentId) {
    return notFound("comment not found");
  }

  const social = await commerceBffService.reportTownhallComment(
    guard.session.accountId,
    dropId,
    commentId
  );
  if (!social) {
    return notFound("comment not found");
  }

  return ok({ social }, 201);
}
