-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('READER', 'AUTHOR', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BandStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'SPLIT_UP', 'CHANGED_NAME', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('VOCALS', 'GUITAR', 'BASS', 'DRUMS', 'KEYBOARDS', 'OTHER');

-- CreateEnum
CREATE TYPE "ReleaseType" AS ENUM ('FULL_LENGTH', 'EP', 'DEMO', 'SPLIT', 'COMPILATION', 'LIVE', 'SINGLE');

-- CreateEnum
CREATE TYPE "ShowStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'POSTPONED', 'SOLD_OUT', 'PAST');

-- CreateEnum
CREATE TYPE "TicketProvider" AS ENUM ('TICKETPRO', 'EVENTIM', 'SEETICKETS', 'TICKETMASTER', 'DICE', 'BANDCAMP', 'DIRECT', 'OTHER');

-- CreateEnum
CREATE TYPE "ListKind" AS ENUM ('BEST_OF', 'PRIMER', 'STAFF_PICK', 'USER');

-- CreateEnum
CREATE TYPE "FestivalStatus" AS ENUM ('ANNOUNCED', 'CONFIRMED', 'CANCELLED', 'POSTPONED', 'PAST');

-- CreateEnum
CREATE TYPE "ArticleType" AS ENUM ('NEWS', 'REVIEW', 'INTERVIEW', 'FEATURE', 'OPINION', 'GUIDE', 'BAND_OF_THE_WEEK');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CitationKind" AS ENUM ('PRIMARY', 'INTERVIEW', 'SECONDARY', 'ACADEMIC', 'ARCHIVAL');

-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('ARTICLE', 'COMMENT', 'BAND', 'SHOW');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ModerationVerdict" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MUSICBRAINZ', 'METAL_ARCHIVES', 'SPOTIFY', 'BANDCAMP', 'LASTFM', 'BANDSINTOWN', 'SONGKICK', 'TICKETPRO', 'EVENTIM', 'RSS', 'WIKIPEDIA', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('OK', 'EMPTY', 'ERROR', 'RATE_LIMITED', 'ROBOTS_BLOCKED');

-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('ARCHIVE_CITATION', 'RECHECK_CITATION', 'SEND_PUSH', 'SEND_DIGEST', 'REINDEX_SEARCH', 'EMBED_BAND');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('COMMENT_REPLY', 'ARTICLE_PUBLISHED', 'SHOW_ANNOUNCED', 'ARTICLE_VOTE', 'REPORT_RESOLVED', 'MENTION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "AuthorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ForumCategory" AS ENUM ('GENERAL', 'RECOMMENDATIONS', 'GEAR', 'LOCAL_SCENES', 'FESTIVALS', 'RELEASES', 'META');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "username" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "bio" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'READER',
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "totpSecret" TEXT,
    "totpEnabledAt" TIMESTAMP(3),
    "recoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "heaviness" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Band" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT,
    "city" TEXT,
    "formedYear" INTEGER,
    "endedYear" INTEGER,
    "status" "BandStatus" NOT NULL DEFAULT 'UNKNOWN',
    "undergroundScore" INTEGER NOT NULL DEFAULT 5,
    "heaviness" INTEGER NOT NULL DEFAULT 5,
    "bio" TEXT,
    "themes" TEXT[],
    "imageUrl" TEXT,
    "bannerUrl" TEXT,
    "websiteUrl" TEXT,
    "bandcampUrl" TEXT,
    "spotifyId" TEXT,
    "metalArchivesId" INTEGER,
    "musicbrainzId" TEXT,
    "tags" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Band_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BandGenre" (
    "bandId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "BandGenre_pkey" PRIMARY KEY ("bandId","genreId")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bornYear" INTEGER,
    "countryCode" TEXT,
    "bio" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BandMember" (
    "id" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT true,
    "fromYear" INTEGER,
    "toYear" INTEGER,

    CONSTRAINT "BandMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ReleaseType" NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "year" INTEGER,
    "coverUrl" TEXT,
    "bandcampUrl" TEXT,
    "spotifyId" TEXT,
    "description" TEXT,
    "trackCount" INTEGER,
    "durationSec" INTEGER,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseRating" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "countryCode" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "capacity" INTEGER,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Show" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "doorsAt" TIMESTAMP(3),
    "venueId" TEXT NOT NULL,
    "status" "ShowStatus" NOT NULL DEFAULT 'SCHEDULED',
    "description" TEXT,
    "posterUrl" TEXT,
    "priceMinor" INTEGER,
    "currency" TEXT,
    "ageLimit" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowBand" (
    "showId" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShowBand_pkey" PRIMARY KEY ("showId","bandId")
);

-- CreateTable
CREATE TABLE "TicketLink" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "provider" "TicketProvider" NOT NULL,
    "url" TEXT NOT NULL,
    "priceMinor" INTEGER,
    "currency" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "affiliateTag" TEXT,
    "lastCheckedAt" TIMESTAMP(3),

    CONSTRAINT "TicketLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPriceHistory" (
    "id" TEXT NOT NULL,
    "ticketLinkId" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BandList" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "ListKind" NOT NULL DEFAULT 'STAFF_PICK',
    "year" INTEGER,
    "curatorId" TEXT NOT NULL,
    "coverUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BandList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BandListItem" (
    "listId" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "BandListItem_pkey" PRIMARY KEY ("listId","bandId")
);

-- CreateTable
CREATE TABLE "Festival" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "countryCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "venueName" TEXT,
    "websiteUrl" TEXT,
    "posterUrl" TEXT,
    "description" TEXT,
    "status" "FestivalStatus" NOT NULL DEFAULT 'ANNOUNCED',
    "undergroundScore" INTEGER NOT NULL DEFAULT 5,
    "priceMinor" INTEGER,
    "currency" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Festival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalBooking" (
    "festivalId" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 99,
    "day" INTEGER,
    "stage" TEXT,

    CONSTRAINT "FestivalBooking_pkey" PRIMARY KEY ("festivalId","bandId")
);

-- CreateTable
CREATE TABLE "FestivalShow" (
    "festivalId" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,

    CONSTRAINT "FestivalShow_pkey" PRIMARY KEY ("festivalId","showId")
);

-- CreateTable
CREATE TABLE "FestivalTicket" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "provider" "TicketProvider" NOT NULL,
    "url" TEXT NOT NULL,
    "priceMinor" INTEGER,
    "currency" TEXT,
    "passType" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "affiliateTag" TEXT,
    "lastCheckedAt" TIMESTAMP(3),

    CONSTRAINT "FestivalTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "type" "ArticleType" NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "excerpt" TEXT,
    "content" JSONB NOT NULL,
    "contentText" TEXT,
    "coverUrl" TEXT,
    "rating" INTEGER,
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "language" TEXT NOT NULL DEFAULT 'en',
    "seriesId" TEXT,
    "seriesPart" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleSeries" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleBand" (
    "articleId" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,

    CONSTRAINT "ArticleBand_pkey" PRIMARY KEY ("articleId","bandId")
);

-- CreateTable
CREATE TABLE "ArticleRevision" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "publisher" TEXT,
    "archiveUrl" TEXT,
    "kind" "CitationKind" NOT NULL DEFAULT 'SECONDARY',
    "excerpt" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentEdit" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "previousBody" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentVote" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" "VoteValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "value" "VoteValue" NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bandId" TEXT,
    "articleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "target" "ReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "articleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleRead" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "editorId" TEXT,
    "verdict" "ModerationVerdict" NOT NULL,
    "notes" TEXT,
    "aiFindings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSource" (
    "id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "externalId" TEXT,
    "url" TEXT,
    "bandId" TEXT,
    "showId" TEXT,
    "festivalId" TEXT,
    "raw" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL,
    "source" "SourceType" NOT NULL,
    "target" TEXT NOT NULL,
    "status" "ScrapeStatus" NOT NULL,
    "itemsSeen" INTEGER NOT NULL DEFAULT 0,
    "itemsNew" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ticketId" TEXT,
    "provider" "TicketProvider" NOT NULL,
    "url" TEXT NOT NULL,
    "referer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPlacement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "html" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryQuery" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "kind" "JobKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleState" (
    "id" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "tokens" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "DirectMessageThread" (
    "id" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessageThreadMember" (
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DirectMessageThreadMember_pkey" PRIMARY KEY ("threadId","userId")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "refKey" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'PENDING',
    "confirmToken" TEXT NOT NULL,
    "unsubscribeToken" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "prefs" JSONB,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailPreference" (
    "userId" TEXT NOT NULL,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "newShowAlerts" BOOLEAN NOT NULL DEFAULT true,
    "newArticleAlerts" BOOLEAN NOT NULL DEFAULT true,
    "productUpdates" BOOLEAN NOT NULL DEFAULT false,
    "inAppShowAlerts" BOOLEAN NOT NULL DEFAULT true,
    "inAppArticleAlerts" BOOLEAN NOT NULL DEFAULT true,
    "inAppCommentReplies" BOOLEAN NOT NULL DEFAULT true,
    "inAppMentions" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeToken" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AuthorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AuthorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "pitch" TEXT NOT NULL,
    "samples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "decisionNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "to" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "meta" JSONB,
    "providerId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumThread" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "ForumCategory" NOT NULL DEFAULT 'GENERAL',
    "authorId" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "lastPostAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BandEmbedding" (
    "bandId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "vector" JSONB NOT NULL,
    "dimension" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BandEmbedding_pkey" PRIMARY KEY ("bandId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Band_slug_key" ON "Band"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Band_metalArchivesId_key" ON "Band"("metalArchivesId");

-- CreateIndex
CREATE UNIQUE INDEX "Band_musicbrainzId_key" ON "Band"("musicbrainzId");

-- CreateIndex
CREATE INDEX "Band_countryCode_idx" ON "Band"("countryCode");

-- CreateIndex
CREATE INDEX "Band_status_idx" ON "Band"("status");

-- CreateIndex
CREATE INDEX "Band_undergroundScore_idx" ON "Band"("undergroundScore");

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE INDEX "BandMember_bandId_idx" ON "BandMember"("bandId");

-- CreateIndex
CREATE INDEX "BandMember_personId_idx" ON "BandMember"("personId");

-- CreateIndex
CREATE INDEX "Release_bandId_idx" ON "Release"("bandId");

-- CreateIndex
CREATE INDEX "Release_year_idx" ON "Release"("year");

-- CreateIndex
CREATE INDEX "ReleaseRating_releaseId_idx" ON "ReleaseRating"("releaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseRating_releaseId_userId_key" ON "ReleaseRating"("releaseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");

-- CreateIndex
CREATE INDEX "Venue_countryCode_city_idx" ON "Venue"("countryCode", "city");

-- CreateIndex
CREATE UNIQUE INDEX "Show_slug_key" ON "Show"("slug");

-- CreateIndex
CREATE INDEX "Show_date_idx" ON "Show"("date");

-- CreateIndex
CREATE INDEX "Show_venueId_idx" ON "Show"("venueId");

-- CreateIndex
CREATE INDEX "ShowBand_bandId_idx" ON "ShowBand"("bandId");

-- CreateIndex
CREATE INDEX "TicketLink_showId_idx" ON "TicketLink"("showId");

-- CreateIndex
CREATE INDEX "TicketPriceHistory_ticketLinkId_observedAt_idx" ON "TicketPriceHistory"("ticketLinkId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BandList_slug_key" ON "BandList"("slug");

-- CreateIndex
CREATE INDEX "BandList_kind_published_idx" ON "BandList"("kind", "published");

-- CreateIndex
CREATE INDEX "BandList_year_idx" ON "BandList"("year");

-- CreateIndex
CREATE INDEX "BandListItem_bandId_idx" ON "BandListItem"("bandId");

-- CreateIndex
CREATE UNIQUE INDEX "Festival_slug_key" ON "Festival"("slug");

-- CreateIndex
CREATE INDEX "Festival_startDate_idx" ON "Festival"("startDate");

-- CreateIndex
CREATE INDEX "Festival_countryCode_startDate_idx" ON "Festival"("countryCode", "startDate");

-- CreateIndex
CREATE INDEX "FestivalBooking_bandId_idx" ON "FestivalBooking"("bandId");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalShow_showId_key" ON "FestivalShow"("showId");

-- CreateIndex
CREATE INDEX "FestivalTicket_festivalId_idx" ON "FestivalTicket"("festivalId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_type_idx" ON "Article"("type");

-- CreateIndex
CREATE INDEX "Article_authorId_idx" ON "Article"("authorId");

-- CreateIndex
CREATE INDEX "Article_seriesId_seriesPart_idx" ON "Article"("seriesId", "seriesPart");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleSeries_slug_key" ON "ArticleSeries"("slug");

-- CreateIndex
CREATE INDEX "ArticleSeries_title_idx" ON "ArticleSeries"("title");

-- CreateIndex
CREATE INDEX "ArticleRevision_articleId_idx" ON "ArticleRevision"("articleId");

-- CreateIndex
CREATE INDEX "Citation_articleId_idx" ON "Citation"("articleId");

-- CreateIndex
CREATE INDEX "Comment_articleId_idx" ON "Comment"("articleId");

-- CreateIndex
CREATE INDEX "CommentEdit_commentId_editedAt_idx" ON "CommentEdit"("commentId", "editedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommentVote_userId_commentId_key" ON "CommentVote"("userId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_articleId_key" ON "Vote"("userId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_bandId_key" ON "Follow"("userId", "bandId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE INDEX "Report_target_targetId_idx" ON "Report"("target", "targetId");

-- CreateIndex
CREATE INDEX "ArticleRead_articleId_readAt_idx" ON "ArticleRead"("articleId", "readAt");

-- CreateIndex
CREATE INDEX "ArticleRead_userId_idx" ON "ArticleRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleRead_articleId_fingerprint_key" ON "ArticleRead"("articleId", "fingerprint");

-- CreateIndex
CREATE INDEX "ModerationEvent_articleId_idx" ON "ModerationEvent"("articleId");

-- CreateIndex
CREATE INDEX "ExternalSource_type_idx" ON "ExternalSource"("type");

-- CreateIndex
CREATE INDEX "ExternalSource_bandId_idx" ON "ExternalSource"("bandId");

-- CreateIndex
CREATE INDEX "ExternalSource_showId_idx" ON "ExternalSource"("showId");

-- CreateIndex
CREATE INDEX "ExternalSource_festivalId_idx" ON "ExternalSource"("festivalId");

-- CreateIndex
CREATE INDEX "ScrapeRun_source_startedAt_idx" ON "ScrapeRun"("source", "startedAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_provider_createdAt_idx" ON "AffiliateClick"("provider", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdPlacement_slug_key" ON "AdPlacement"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryQuery_hash_key" ON "DiscoveryQuery"("hash");

-- CreateIndex
CREATE INDEX "DiscoveryQuery_createdAt_idx" ON "DiscoveryQuery"("createdAt");

-- CreateIndex
CREATE INDEX "Job_status_runAt_idx" ON "Job"("status", "runAt");

-- CreateIndex
CREATE INDEX "Job_kind_status_idx" ON "Job"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessageThread_canonicalKey_key" ON "DirectMessageThread"("canonicalKey");

-- CreateIndex
CREATE INDEX "DirectMessageThread_lastMessageAt_idx" ON "DirectMessageThread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "DirectMessageThreadMember_userId_archived_idx" ON "DirectMessageThreadMember"("userId", "archived");

-- CreateIndex
CREATE INDEX "DirectMessage_threadId_createdAt_idx" ON "DirectMessage"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_refKey_idx" ON "Notification"("refKey");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_unsubscribeToken_key" ON "EmailPreference"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorApplication_userId_key" ON "AuthorApplication"("userId");

-- CreateIndex
CREATE INDEX "AuthorApplication_status_createdAt_idx" ON "AuthorApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_userId_sentAt_idx" ON "EmailLog"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_template_sentAt_idx" ON "EmailLog"("template", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_token_key" ON "AuthToken"("token");

-- CreateIndex
CREATE INDEX "AuthToken_userId_kind_idx" ON "AuthToken"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ForumThread_slug_key" ON "ForumThread"("slug");

-- CreateIndex
CREATE INDEX "ForumThread_category_pinned_lastPostAt_idx" ON "ForumThread"("category", "pinned", "lastPostAt");

-- CreateIndex
CREATE INDEX "ForumPost_threadId_createdAt_idx" ON "ForumPost"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumPost_authorId_idx" ON "ForumPost"("authorId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Genre" ADD CONSTRAINT "Genre_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Genre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandGenre" ADD CONSTRAINT "BandGenre_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandGenre" ADD CONSTRAINT "BandGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandMember" ADD CONSTRAINT "BandMember_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandMember" ADD CONSTRAINT "BandMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseRating" ADD CONSTRAINT "ReleaseRating_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseRating" ADD CONSTRAINT "ReleaseRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Show" ADD CONSTRAINT "Show_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowBand" ADD CONSTRAINT "ShowBand_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowBand" ADD CONSTRAINT "ShowBand_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLink" ADD CONSTRAINT "TicketLink_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPriceHistory" ADD CONSTRAINT "TicketPriceHistory_ticketLinkId_fkey" FOREIGN KEY ("ticketLinkId") REFERENCES "TicketLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandList" ADD CONSTRAINT "BandList_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandListItem" ADD CONSTRAINT "BandListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "BandList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandListItem" ADD CONSTRAINT "BandListItem_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalBooking" ADD CONSTRAINT "FestivalBooking_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalBooking" ADD CONSTRAINT "FestivalBooking_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalShow" ADD CONSTRAINT "FestivalShow_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalShow" ADD CONSTRAINT "FestivalShow_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalTicket" ADD CONSTRAINT "FestivalTicket_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ArticleSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleBand" ADD CONSTRAINT "ArticleBand_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleBand" ADD CONSTRAINT "ArticleBand_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRevision" ADD CONSTRAINT "ArticleRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRevision" ADD CONSTRAINT "ArticleRevision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentEdit" ADD CONSTRAINT "CommentEdit_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRead" ADD CONSTRAINT "ArticleRead_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSource" ADD CONSTRAINT "ExternalSource_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSource" ADD CONSTRAINT "ExternalSource_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSource" ADD CONSTRAINT "ExternalSource_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageThreadMember" ADD CONSTRAINT "DirectMessageThreadMember_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectMessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageThreadMember" ADD CONSTRAINT "DirectMessageThreadMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectMessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorApplication" ADD CONSTRAINT "AuthorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorApplication" ADD CONSTRAINT "AuthorApplication_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

