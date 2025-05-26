import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { buildSchema, GraphQLSchema, execute, parse, validate } from 'graphql';
import { createResolvers } from './resolvers/resolvers.js';
import { FastifyRequest } from 'fastify';
import depthLimit from 'graphql-depth-limit';

const schemaContent = `
type MemberType {
  id: MemberTypeId!
  discount: Float!
  postsLimitPerMonth: Int!
}

enum MemberTypeId {
  BASIC
  BUSINESS
}

type Post {
  id: UUID!
  title: String!
  content: String!
}

type Profile {
  id: UUID!
  isMale: Boolean!
  yearOfBirth: Int!
  memberType: MemberType!
}

type User {
  id: UUID!
  name: String!
  balance: Float!
  profile: Profile
  posts: [Post!]!
  userSubscribedTo: [User!]!
  subscribedToUser: [User!]!
}

type RootQueryType {
  memberTypes: [MemberType!]!
  memberType(id: MemberTypeId!): MemberType
  users: [User!]!
  user(id: UUID!): User
  posts: [Post!]!
  post(id: UUID!): Post
  profiles: [Profile!]!
  profile(id: UUID!): Profile
}

type Mutations {
  createUser(dto: CreateUserInput!): User!
  createProfile(dto: CreateProfileInput!): Profile!
  createPost(dto: CreatePostInput!): Post!
  changePost(id: UUID!, dto: ChangePostInput!): Post!
  changeProfile(id: UUID!, dto: ChangeProfileInput!): Profile!
  changeUser(id: UUID!, dto: ChangeUserInput!): User!
  deleteUser(id: UUID!): String!
  deletePost(id: UUID!): String!
  deleteProfile(id: UUID!): String!
  subscribeTo(userId: UUID!, authorId: UUID!): String!
  unsubscribeFrom(userId: UUID!, authorId: UUID!): String!
}

input ChangePostInput {
  title: String
  content: String
}

input ChangeProfileInput {
  isMale: Boolean
  yearOfBirth: Int
  memberTypeId: MemberTypeId
}

input ChangeUserInput {
  name: String
  balance: Float
}

input CreatePostInput {
  title: String!
  content: String!
  authorId: UUID!
}

input CreateProfileInput {
  isMale: Boolean!
  yearOfBirth: Int!
  userId: UUID!
  memberTypeId: MemberTypeId!
}

input CreateUserInput {
  name: String!
  balance: Float!
}

scalar UUID

schema {
  query: RootQueryType
  mutation: Mutations
}
`;

const schema: GraphQLSchema = buildSchema(schemaContent);

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const resolvers = createResolvers(fastify);

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      body: createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(
      req: FastifyRequest<{
        Body: { query: string; variables?: Record<string, unknown> };
      }>,
    ) {
      const { query, variables } = req.body;
      const document = parse(query);
      const validationErrors = validate(schema, document, [depthLimit(5)]);
      if (validationErrors.length > 0) {
        return { data: null, errors: validationErrors };
      }

      const result = await execute({
        schema,
        document,
        variableValues: variables,
        rootValue: resolvers,
      });

      return result;
    },
  });
};

export default plugin;
