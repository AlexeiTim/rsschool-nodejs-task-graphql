import { FastifyInstance } from 'fastify';

export function createResolvers(fastify: FastifyInstance) {
  return {
    async memberTypes() {
      return fastify.prisma.memberType.findMany();
    },
    async memberType(args: { id?: string; memberTypeId?: string }) {
      const id = args.id ?? args.memberTypeId;
      if (!id) return null;
      return fastify.prisma.memberType.findUnique({ where: { id } });
    },
    async users() {
      const users = await fastify.prisma.user.findMany();
      return Promise.all(
        users.map(async (user) => {
          const profile = await fastify.prisma.profile.findUnique({
            where: { userId: user.id },
            include: { memberType: true },
          });
          const posts = await fastify.prisma.post.findMany({
            where: { authorId: user.id },
          });
          const userSubscribedTo = await fastify.prisma.subscribersOnAuthors.findMany({
            where: { subscriberId: user.id },
            include: { author: true },
          });
          const subscribedToUser = await fastify.prisma.subscribersOnAuthors.findMany({
            where: { authorId: user.id },
            include: { subscriber: true },
          });
          return {
            ...user,
            profile,
            posts,
            userSubscribedTo: userSubscribedTo.map((s) => s.author),
            subscribedToUser: subscribedToUser.map((s) => s.subscriber),
          };
        }),
      );
    },
    async user(args: { id?: string }) {
      if (!args.id) return null;
      const user = await fastify.prisma.user.findUnique({ where: { id: args.id } });
      if (!user) return null;

      const profile = await fastify.prisma.profile.findUnique({
        where: { userId: user.id },
        include: { memberType: true },
      });

      const posts = await fastify.prisma.post.findMany({
        where: { authorId: user.id },
      });

      const userSubscribedTo = await fastify.prisma.subscribersOnAuthors.findMany({
        where: { subscriberId: user.id },
        include: {
          author: true,
        },
      });

      const subscribedToUser = await fastify.prisma.subscribersOnAuthors.findMany({
        where: { authorId: user.id },
        include: {
          subscriber: true,
        },
      });

      const userSubscribedToWithSubs = await Promise.all(
        userSubscribedTo.map(async (sub) => {
          const authorSubs = await fastify.prisma.subscribersOnAuthors.findMany({
            where: { authorId: sub.authorId },
            include: { subscriber: true },
          });
          return {
            ...sub.author,
            subscribedToUser: authorSubs.map((s) => s.subscriber),
          };
        }),
      );

      const subscribedToUserWithSubs = await Promise.all(
        subscribedToUser.map(async (sub) => {
          const subscriberSubs = await fastify.prisma.subscribersOnAuthors.findMany({
            where: { subscriberId: sub.subscriberId },
            include: { author: true },
          });
          return {
            ...sub.subscriber,
            userSubscribedTo: subscriberSubs.map((s) => s.author),
          };
        }),
      );

      return {
        ...user,
        profile,
        posts,
        userSubscribedTo: userSubscribedToWithSubs,
        subscribedToUser: subscribedToUserWithSubs,
      };
    },
    async posts() {
      return fastify.prisma.post.findMany();
    },
    async post(args: { id?: string }) {
      if (!args.id) return null;
      return fastify.prisma.post.findUnique({ where: { id: args.id } });
    },
    async profiles() {
      const profiles = await fastify.prisma.profile.findMany({
        include: { memberType: true },
      });
      return profiles;
    },
    async profile(args: { id?: string; userId?: string }) {
      if (args.id) {
        return fastify.prisma.profile.findUnique({
          where: { id: args.id },
          include: { memberType: true },
        });
      }
      if (args.userId) {
        return fastify.prisma.profile.findUnique({
          where: { userId: args.userId },
          include: { memberType: true },
        });
      }
      return null;
    },
  };
}
