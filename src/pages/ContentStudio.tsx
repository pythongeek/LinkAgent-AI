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
import { Loader2, Sparkles, Wand2, BookOpen, Lightbulb, Copy, Check } from 'lucide-react';

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
  const [isCopied, setIsCopied] = useState(false);

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

  const handleCopy = async () => {
    if (!generatedContent?.content) return;

    try {
      await navigator.clipboard.writeText(generatedContent.content);
      setIsCopied(true);
      toast.success('Content copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Failed to copy content');
    }
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
                  Generating...
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
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
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleCopy}
                      disabled={!generatedContent?.content}
                    >
                      {isCopied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy to Clipboard
                        </>
                      )}
                    </Button>
                    <Button className="flex-1">Save to Library</Button>
                  </div>
                </TabsContent>

                <TabsContent value="research">
                  <div className="space-y-4">
                    {generatedContent.researchData?.keyInsights?.map((insight: string, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-muted">
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
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
