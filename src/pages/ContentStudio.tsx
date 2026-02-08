import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { contentApi, personaApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Sparkles, Wand2, BookOpen, Lightbulb } from 'lucide-react';

const contentTypes = [
  { value: 'post', label: 'LinkedIn Post', icon: Sparkles },
  { value: 'carousel', label: 'Carousel/Slides', icon: BookOpen },
  { value: 'article', label: 'Article', icon: BookOpen },
  { value: 'poll', label: 'Poll', icon: Lightbulb },
];

export default function ContentStudio() {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('post');
  const [personaId, setPersonaId] = useState('');
  const [researchDepth, setResearchDepth] = useState('quick');
  const [includeImages] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: personas } = useQuery({
    queryKey: ['personas'],
    queryFn: () => personaApi.getAll().then((res) => res.data.personas),
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => contentApi.generate(data),
    onSuccess: (res) => {
      setGeneratedContent(res.data.content);
      toast.success('Content generated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to generate content');
    },
  });

  const handleGenerate = async () => {
    if (!topic) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    generateMutation.mutate({
      topic,
      contentType,
      personaId: personaId || undefined,
      researchDepth,
      includeImages,
    });
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Studio</h1>
          <p className="text-muted-foreground">
            Generate AI-powered LinkedIn content with your personas
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Create Content</CardTitle>
            <CardDescription>Configure your content generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., The future of AI in healthcare"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Persona</Label>
              <Select value={personaId} onValueChange={setPersonaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a persona (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {personas?.map((persona: any) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name} {persona.isDefault && '(Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Research Depth</Label>
              <Select value={researchDepth} onValueChange={setResearchDepth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Quick (faster)</SelectItem>
                  <SelectItem value="deep">Deep (more comprehensive)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              className="w-full"
              disabled={isGenerating || generateMutation.isPending}
            >
              {isGenerating || generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Orchestrating AI Agents...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>Preview and edit your content</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <Tabs defaultValue="content">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="strategy">Strategy</TabsTrigger>
                  <TabsTrigger value="review">Review</TabsTrigger>
                  <TabsTrigger value="research">Research</TabsTrigger>
                  <TabsTrigger value="sources">Sources</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge>{generatedContent.contentType}</Badge>
                    {generatedContent.engagementPrediction && (
                      <Badge variant="outline">
                        Engagement: {generatedContent.engagementPrediction}/100
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    value={generatedContent.content}
                    onChange={(e) =>
                      setGeneratedContent({ ...generatedContent, content: e.target.value })
                    }
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Copy to Clipboard
                    </Button>
                    <Button className="flex-1">Save to Library</Button>
                  </div>
                </TabsContent>

                <TabsContent value="strategy">
                  <div className="space-y-4">
                    {generatedContent.outline?.strategy && (
                      <div className="grid gap-4">
                        <div className="p-4 rounded-lg bg-muted/50 border">
                          <h4 className="font-semibold mb-2">Hook</h4>
                          <p className="text-sm italic">"{generatedContent.outline.strategy.hook}"</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-muted border">
                            <span className="text-xs text-muted-foreground uppercase font-bold">Angle</span>
                            <p className="text-sm">{generatedContent.outline.strategy.angle}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted border">
                            <span className="text-xs text-muted-foreground uppercase font-bold">Structure</span>
                            <p className="text-sm">{generatedContent.outline.strategy.structure}</p>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted border">
                          <span className="text-xs text-muted-foreground uppercase font-bold">Target Audience</span>
                          <p className="text-sm">{generatedContent.outline.strategy.targetAudience}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="review">
                  <div className="space-y-4">
                    {generatedContent.outline?.review && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                          <span className="font-semibold">Virality Score</span>
                          <Badge variant={generatedContent.outline.review.score > 80 ? "default" : "secondary"}>
                            {generatedContent.outline.review.score}/100
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Critique</h4>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {generatedContent.outline.review.critique.map((item: string, i: number) => (
                              <li key={i} className="text-muted-foreground">{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Improvements Made</h4>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {generatedContent.outline.review.suggestions.map((item: string, i: number) => (
                              <li key={i} className="text-green-600 dark:text-green-400">{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="research">
                  <div className="space-y-4">
                    {generatedContent.researchData?.keyInsights?.map((insight: string, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-muted">
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
                    {generatedContent.researchData?.statistics?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Statistics</h4>
                        <div className="space-y-2">
                          {generatedContent.researchData.statistics.map((stat: any, i: number) => (
                            <div key={i} className="text-sm border-l-2 border-primary pl-3 py-1">
                              {stat.fact}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="sources">
                  <div className="space-y-2">
                    {generatedContent.sources?.map((source: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
                        <span className="text-sm font-medium">{source.title}</span>
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your generated content will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
